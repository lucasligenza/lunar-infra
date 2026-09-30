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


def create_app(data_dir: Path = PROCESSED, db_path: Path | None = None) -> FastAPI:
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
        yield
        application.state.store = None

    application = FastAPI(title="LunarOS Scientific API", version="0.1.0",
                          description="NASA LOLA south-pole terrain and modeled solar visibility. ME/PA DE421 frame.",
                          lifespan=lifespan)
    application.include_router(router)
    application.include_router(mission_router)
    return application


app = create_app()
