"""add_grading_result_models

Revision ID: 3ab565ed3825
Revises: 8b701869a4ad
Create Date: 2026-11-27 16:21:55.182652

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '3ab565ed3825'
down_revision: Union[str, None] = '8b701869a4ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DO $$ BEGIN CREATE TYPE gradingstatus AS ENUM ('AUTO','PENDING','GRADED'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE resultstatus AS ENUM ('PASS','FAIL'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE resultpublicationstatus AS ENUM ('PENDING','GRADED','PUBLISHED'); EXCEPTION WHEN duplicate_object THEN null; END $$;")

    op.execute("""
        CREATE TABLE IF NOT EXISTS results (
            id BIGSERIAL PRIMARY KEY,
            attempt_id BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
            candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            examination_id BIGINT NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
            total_marks NUMERIC(10,2) NOT NULL,
            obtained_marks NUMERIC(10,2) NOT NULL DEFAULT 0,
            percentage NUMERIC(7,4) NOT NULL DEFAULT 0,
            passing_marks NUMERIC(10,2),
            result_status resultstatus,
            publication_status resultpublicationstatus NOT NULL DEFAULT 'PENDING',
            published_at TIMESTAMPTZ,
            published_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_results_attempt_id UNIQUE (attempt_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_results_attempt_id ON results (attempt_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_results_candidate_id ON results (candidate_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_results_examination_id ON results (examination_id)")

    op.add_column('responses', sa.Column('awarded_marks', sa.Numeric(precision=10, scale=2), nullable=True))
    op.execute("ALTER TABLE responses ADD COLUMN IF NOT EXISTS grading_status gradingstatus")
    op.add_column('responses', sa.Column('examiner_feedback', sa.Text(), nullable=True))
    op.add_column('responses', sa.Column('graded_by_id', sa.UUID(), nullable=True))
    op.add_column('responses', sa.Column('graded_at', sa.DateTime(timezone=True), nullable=True))
    op.execute("ALTER TABLE responses ADD CONSTRAINT fk_responses_graded_by FOREIGN KEY (graded_by_id) REFERENCES users(id) ON DELETE SET NULL")


def downgrade() -> None:
    op.execute("ALTER TABLE responses DROP CONSTRAINT IF EXISTS fk_responses_graded_by")
    op.drop_column('responses', 'graded_at')
    op.drop_column('responses', 'graded_by_id')
    op.drop_column('responses', 'examiner_feedback')
    op.execute("ALTER TABLE responses DROP COLUMN IF EXISTS grading_status")
    op.drop_column('responses', 'awarded_marks')
    op.drop_table('results')
    op.execute("DROP TYPE IF EXISTS resultpublicationstatus")
    op.execute("DROP TYPE IF EXISTS resultstatus")
    op.execute("DROP TYPE IF EXISTS gradingstatus")
