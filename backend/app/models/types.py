"""Column helpers so every enum is declared the same way."""

from enum import StrEnum

from sqlalchemy import CheckConstraint
from sqlalchemy import Enum as SAEnum


def enum_column(enum_cls: type[StrEnum]) -> SAEnum:
    """VARCHAR holding the enum *value*; pair it with `enum_check` in __table_args__."""
    return SAEnum(
        enum_cls,
        native_enum=False,
        create_constraint=False,
        validate_strings=True,
        length=max(len(m.value) for m in enum_cls),
        values_callable=lambda e: [m.value for m in e],
    )


def enum_check(column: str, enum_cls: type[StrEnum]) -> CheckConstraint:
    """Explicit CHECK: SQLAlchemy's Enum constraint clashes with the naming convention."""
    values = ", ".join(f"'{m.value}'" for m in enum_cls)
    return CheckConstraint(f"{column} IN ({values})", name=f"{column}_valid")
