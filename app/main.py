
import os

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy import inspect, text

from app.database import Base, engine
from app import models

from app.routes import router as task_router
from app.auth_routes import router as auth_router
from app.project_routes import router as project_router


app = FastAPI(title="TaskFlow API")


# Session configuration
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv(
        "SECRET_KEY",
        "taskflow-local-development-key-change-me"
    ),
    same_site="lax",
    https_only=os.getenv("ENVIRONMENT") == "production"
)


# Create database tables
Base.metadata.create_all(bind=engine)


# Safely update existing tasks table
inspector = inspect(engine)

if "tasks" in inspector.get_table_names():

    columns = {
        column["name"]
        for column in inspector.get_columns("tasks")
    }

    with engine.begin() as connection:

        if "user_id" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE tasks "
                    "ADD COLUMN user_id INTEGER REFERENCES users(id)"
                )
            )

        if "project_id" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE tasks "
                    "ADD COLUMN project_id INTEGER REFERENCES projects(id)"
                )
            )


# Register API routers
app.include_router(task_router)
app.include_router(auth_router)
app.include_router(project_router)


# Frontend static files
app.mount(
    "/static",
    StaticFiles(directory="frontend"),
    name="static"
)


# Dashboard page
@app.get("/")
def home(request: Request):

    if not request.session.get("user_id"):
        return RedirectResponse(url="/login")

    return FileResponse("frontend/index.html")


# Login page
@app.get("/login")
def login_page():
    return FileResponse("frontend/login.html")


# Health check
@app.get("/api/health")
def health():
    return {"status": "TaskFlow is running"}
