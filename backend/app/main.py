from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path

from fastapi import FastAPI
import rasterio

from backend.app.api.routes import router
from backend.app.api.missions import router as mission_router
from backend.app.services.scenarios import ScenarioRepository
from lunaros.dataset import ROOT
from backend.app.data.pipeline import PROCESSED
from backend.app.services.inspection import TerrainStore
from backend.app.api.globe import router as globe_router
from backend.app.services.globe import GlobeStore
from backend.app.data.globe import OUTPUT as GLOBE_DIR
from backend.app.data.atlas import OUTPUT as ATLAS_DIR
from backend.app.services.atlas import AtlasStore
from backend.app.api.atlas import router as atlas_router


def create_app(data_dir: Path = PROCESSED, db_path: Path | None = None, globe_dir: Path = GLOBE_DIR, atlas_dir: Path = ATLAS_DIR) -> FastAPI:
    # https://fastapi.tiangolo.com/advanced/events/
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        application.state.scenarios = ScenarioRepository(db_path or Path(os.environ.get("LUNAROS_DB_PATH", ROOT / "data/local/missions.sqlite")))
        try:
            application.state.store = TerrainStore(data_dir)
            application.state.data_error = None
        except (OSError, ValueError, KeyError, rasterio.errors.RasterioError) as error:
            application.state.store = None
            application.state.data_error = "Scientific data unavailable or invalid. Run the data pipeline and restart."
            logging.getLogger(__name__).warning("Scientific dataset loading failed: %s", error)
        try:
            application.state.globe = GlobeStore(globe_dir)
        except (OSError, ValueError, KeyError) as error:
            application.state.globe = None
            logging.getLogger(__name__).warning('Global data unavailable: %s', error)
        application.state.atlas = AtlasStore(atlas_dir, application.state.globe, application.state.store)
        yield
        application.state.atlas.close()
        application.state.store = None

    application = FastAPI(title="LunarOS Scientific API", version="0.1.0",
                          description="NASA LOLA south-pole terrain and modeled solar visibility. ME/PA DE421 frame.",
                          lifespan=lifespan)
    application.include_router(router)
    application.include_router(mission_router)
    application.include_router(globe_router)
    application.include_router(atlas_router)
    return application


app = create_app()
