from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    Base class for all models
    - Adds id column on all tables
    """

    id: Mapped[int] = mapped_column(primary_key=True)
    __name__: str
