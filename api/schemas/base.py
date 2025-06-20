from pydantic import BaseModel


class ORMBase(BaseModel):
    id: int | None = None

    class Config:
        from_attributes = True

class Unit(ORMBase):
    name: str | None = None
    name_short: str | None = None
    description: str | None = None
