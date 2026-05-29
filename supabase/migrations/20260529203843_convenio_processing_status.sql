-- Tracks per-convenio processing progress emitted by n8n via the
-- webhook-progress Edge Function. Upserted by SERVICE_ROLE; read by the
-- owner of the convenio (front-end polling / Realtime).

create table public.convenio_processing_status (
    convenio_id uuid primary key references public.convenios(id) on delete cascade,
    stage varchar(50) not null,
    progress smallint not null check (progress between 0 and 100),
    message text,
    updated_at timestamptz not null default now()
);

create index idx_convenio_processing_status_updated_at
    on public.convenio_processing_status(updated_at desc);

alter table public.convenio_processing_status enable row level security;

-- Authenticated users can read progress for convenios they own.
create policy "processing_status: owner can read"
on public.convenio_processing_status for select to authenticated
using (
  exists (
    select 1 from public.convenios c
    where c.id = convenio_processing_status.convenio_id
      and c.owner_id = auth.uid()
  )
);

-- service_role bypasses RLS, so n8n (via webhook-progress) can upsert freely.
-- No insert/update policy for authenticated on purpose: progress is write-only
-- from the backend.
