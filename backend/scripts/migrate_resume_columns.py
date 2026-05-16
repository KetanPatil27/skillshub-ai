import asyncio
from sqlalchemy import text
from app.core.database import engine

async def update_db():
    async with engine.begin() as conn:
        print("Checking for resume columns in employees table...")
        # Check if columns exist
        res = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='employees' AND column_name IN ('resume_content', 'resume_filename');
        """))
        existing_cols = [r[0] for r in res.fetchall()]
        
        if 'resume_content' not in existing_cols:
            print("Adding resume_content column...")
            await conn.execute(text("ALTER TABLE employees ADD COLUMN resume_content BYTEA;"))
        
        if 'resume_filename' not in existing_cols:
            print("Adding resume_filename column...")
            await conn.execute(text("ALTER TABLE employees ADD COLUMN resume_filename VARCHAR(255);"))
        
        print("Done.")

if __name__ == "__main__":
    asyncio.run(update_db())
