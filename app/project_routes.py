
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Project, User

router = APIRouter(prefix="/api/projects", tags=["Projects"])


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    status: str = "active"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None


def get_user(request: Request, db: Session):
    user_id = request.session.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Please log in")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Please log in")

    return user


def project_to_dict(project):
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "created_at": (
            project.created_at.isoformat()
            if project.created_at else None
        )
    }


@router.get("/")
def get_projects(
    request: Request,
    db: Session = Depends(get_db)
):
    user = get_user(request, db)

    projects = db.query(Project).filter(
        Project.user_id == user.id
    ).all()

    return [project_to_dict(project) for project in projects]


@router.post("/")
def create_project(
    data: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    user = get_user(request, db)

    name = data.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Project name is required"
        )

    if data.status not in ["active", "completed", "on_hold"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid project status"
        )

    project = Project(
        name=name,
        description=data.description.strip(),
        status=data.status,
        user_id=user.id
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return project_to_dict(project)


@router.put("/{project_id}")
def update_project(
    project_id: int,
    data: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    user = get_user(request, db)

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    updates = data.model_dump(exclude_unset=True)

    if "name" in updates:
        if updates["name"] is None or not updates["name"].strip():
            raise HTTPException(
                status_code=400,
                detail="Project name cannot be empty"
            )
        updates["name"] = updates["name"].strip()

    if "description" in updates and updates["description"] is None:
        updates["description"] = ""

    if "status" in updates and updates["status"] not in [
        "active", "completed", "on_hold"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid project status"
        )

    for key, value in updates.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)

    return project_to_dict(project)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    user = get_user(request, db)

    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user.id
    ).first()

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    # Keep existing tasks; simply remove their project assignment.
    for task in project.tasks:
        task.project_id = None

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully"}
