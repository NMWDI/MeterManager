from fastapi import HTTPException
from pydantic import BaseModel


def _patch(db, table, dbid, obj: BaseModel):
    db_item = _get(db, table, dbid)
    for k, v in obj.model_dump(exclude_unset=True).items():
        try:
            setattr(db_item, k, v)
        except AttributeError as e:
            print(e)
            continue

    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def _add(db, table, obj):
    db_item = table(**obj.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def _delete(db, table, dbid):
    db_item = _get(db, table, dbid)
    db.delete(db_item)
    db.commit()
    return {"ok": True}


def _get(db, table, dbid):
    db_item = db.get(table, dbid)
    if not db_item:
        raise HTTPException(status_code=404, detail=f"{table}.{dbid} not found")

    return db_item
