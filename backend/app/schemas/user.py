from pydantic import BaseModel, ConfigDict


class UserRef(BaseModel):
    """Minimal identity embedded in every meeting row."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    avatar_url: str | None = None


class UserRead(UserRef):
    email: str
