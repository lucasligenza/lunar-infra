"""Bounded public ZIP member acquisition without downloading unrelated products."""
import io
import re
import shutil
import urllib.request
import zipfile
from pathlib import Path


class RangeArchive(io.RawIOBase):
    def __init__(self,url,expected_bytes,budget_bytes=128*1024*1024):
        super().__init__();self.url=url;self.size=expected_bytes;self.position=0;self.received=0;self.budget=budget_bytes
        with urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=60) as response:
            if int(response.headers['Content-Length'])!=expected_bytes:raise ValueError('Archive size differs from verified metadata')
            self.etag=response.headers.get('ETag')
    def readable(self):return True
    def seekable(self):return True
    def tell(self):return self.position
    def seek(self,offset,whence=0):
        position=offset if whence==0 else self.position+offset if whence==1 else self.size+offset
        if not 0<=position<=self.size:raise ValueError('Archive seek outside source')
        self.position=position;return position
    def read(self,size=-1):
        count=min(self.size-self.position,size if size>=0 else self.size-self.position)
        if not count:return b''
        if count>8*1024*1024 or self.received+count>self.budget:raise ValueError('Archive request exceeds bounded acquisition budget')
        end=self.position+count-1;headers={'Range':f'bytes={self.position}-{end}'}
        if self.etag:headers['If-Match']=self.etag
        with urllib.request.urlopen(urllib.request.Request(self.url,headers=headers),timeout=120) as response:
            match=re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)',response.headers.get('Content-Range',''))
            if response.status!=206 or not match or tuple(map(int,match.groups()))!=(self.position,end,self.size):
                raise ValueError('Provider does not honor exact byte ranges; no whole-archive fallback')
            data=response.read(count+1)
            if len(data)!=count:raise ValueError('Incomplete or oversized archive range')
        self.received+=count;self.position+=count;return data


def inspect_archive(url,expected_bytes):
    with RangeArchive(url,expected_bytes) as remote,zipfile.ZipFile(remote) as archive:
        return [{'member':item.filename,'compressed_bytes':item.compress_size,'bytes':item.file_size,'crc32':item.CRC}
                for item in archive.infolist() if not item.is_dir()]


def acquire_members(url,expected_bytes,members,directory:Path,budget_bytes=128*1024*1024):
    selected=sum(item['compressed_bytes'] for item in members)
    if selected+2*1024*1024>budget_bytes:raise ValueError('Selected ZIP members exceed download budget')
    directory.mkdir(parents=True,exist_ok=True)
    if shutil.disk_usage(directory).free<3*sum(item['bytes'] for item in members):raise ValueError('Insufficient disk space for selected archive members and prepared data')
    with RangeArchive(url,expected_bytes,budget_bytes) as remote,zipfile.ZipFile(remote) as archive:
        for spec in members:
            info=archive.getinfo(spec['member'])
            if (info.compress_size,info.file_size,info.CRC)!=(spec['compressed_bytes'],spec['bytes'],spec['crc32']):raise ValueError('Archive member metadata changed')
            name=Path(info.filename).name
            if name!=spec.get('filename',name):raise ValueError('Unexpected local member filename')
            target=directory/name;temporary=directory/(name+'.partial')
            try:
                with archive.open(info) as source,temporary.open('wb') as output:
                    total=0
                    while chunk:=source.read(4*1024*1024):
                        total+=len(chunk)
                        if total>spec['bytes']:raise ValueError('Extracted file exceeds expected size')
                        output.write(chunk)
                if total!=spec['bytes']:raise ValueError('Truncated extracted file')
                # ZipExtFile checks CRC while reading. Pinning adds content integrity.
                if 'sha256' in spec:
                    from lunaros.dataset import checksum
                    if checksum(temporary)!=spec['sha256']:raise ValueError('Archive member checksum differs from pinned source')
                temporary.replace(target)
            finally:temporary.unlink(missing_ok=True)
        return {'downloaded_bytes':remote.received,'archive_bytes':expected_bytes,'selected_members':len(members)}
