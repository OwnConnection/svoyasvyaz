create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  username text unique not null check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null,
  avatar_url text,
  bio text not null default '',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.direct_chats (
  id uuid primary key default gen_random_uuid(),
  chat_type text not null default 'direct' check (chat_type in ('direct', 'group', 'channel', 'favorites')),
  title text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.direct_chat_members (
  chat_id uuid not null references public.direct_chats (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (chat_id, user_id)
);

create table if not exists public.user_stickers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  image_url text not null,
  image_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  call_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  chat_id uuid references public.direct_chats (id) on delete set null,
  partner_id uuid references public.profiles (id) on delete set null,
  direction text not null check (direction in ('incoming', 'outgoing')),
  status text not null default 'ringing' check (status in ('ringing', 'connected', 'declined', 'missed', 'canceled', 'ended')),
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.direct_chats (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text,
  attachment_url text,
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  sticker_id uuid references public.user_stickers (id) on delete set null,
  sticker_url text,
  sticker_name text,
  edited_at timestamptz,
  deleted_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists last_seen_at timestamptz not null default now();
alter table public.direct_chats add column if not exists chat_type text not null default 'direct';
alter table public.direct_chats add column if not exists title text;
alter table public.direct_chats add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.direct_chat_members add column if not exists last_read_at timestamptz;
alter table public.direct_chat_members add column if not exists role text not null default 'member';
alter table public.messages add column if not exists attachment_url text;
alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists attachment_type text;
alter table public.messages add column if not exists attachment_size bigint;
alter table public.messages add column if not exists sticker_id uuid references public.user_stickers (id) on delete set null;
alter table public.messages add column if not exists sticker_url text;
alter table public.messages add column if not exists sticker_name text;
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists deleted_at timestamptz;
alter table public.messages add column if not exists is_deleted boolean not null default false;
alter table public.call_logs add column if not exists chat_id uuid references public.direct_chats (id) on delete set null;
alter table public.call_logs add column if not exists partner_id uuid references public.profiles (id) on delete set null;
alter table public.call_logs add column if not exists direction text not null default 'outgoing';
alter table public.call_logs add column if not exists status text not null default 'ringing';
alter table public.call_logs add column if not exists started_at timestamptz not null default now();
alter table public.call_logs add column if not exists answered_at timestamptz;
alter table public.call_logs add column if not exists ended_at timestamptz;
alter table public.call_logs add column if not exists updated_at timestamptz not null default now();
alter table public.messages alter column content drop not null;
alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages drop constraint if exists messages_content_or_attachment_check;
alter table public.messages add constraint messages_content_or_attachment_check
check (length(trim(coalesce(content, ''))) > 0 or attachment_url is not null or sticker_url is not null);

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('avatars', 'avatars', true, 5242880),
  ('attachments', 'attachments', true, 20971520),
  ('stickers', 'stickers', true, 5242880)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.direct_chats;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.direct_chat_members;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.messages;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.user_stickers;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.user_blocks;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.call_logs;
  exception
    when duplicate_object then null;
  end;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.direct_chats enable row level security;
alter table public.direct_chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.user_stickers enable row level security;
alter table public.user_blocks enable row level security;
alter table public.call_logs enable row level security;

create or replace function public.is_chat_member(target_chat uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.direct_chat_members members
    where members.chat_id = target_chat and members.user_id = auth.uid()
  );
$$;

create or replace function public.can_post_to_chat(target_chat uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.direct_chats chats
    join public.direct_chat_members members
      on members.chat_id = chats.id
     and members.user_id = auth.uid()
    where chats.id = target_chat
      and (chats.chat_type <> 'channel' or chats.created_by = auth.uid())
      and (
        chats.chat_type <> 'direct'
        or not exists (
          select 1
          from public.direct_chat_members first_member
          join public.direct_chat_members second_member
            on second_member.chat_id = first_member.chat_id
           and second_member.user_id <> first_member.user_id
          join public.user_blocks blocks
            on (blocks.blocker_id = first_member.user_id and blocks.blocked_id = second_member.user_id)
            or (blocks.blocker_id = second_member.user_id and blocks.blocked_id = first_member.user_id)
          where first_member.chat_id = chats.id
            and first_member.user_id = auth.uid()
        )
      )
  );
$$;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "attachments_public_read" on storage.objects;
create policy "attachments_public_read"
on storage.objects for select
to public
using (bucket_id = 'attachments');

drop policy if exists "attachments_owner_insert" on storage.objects;
create policy "attachments_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "stickers_public_read" on storage.objects;
create policy "stickers_public_read"
on storage.objects for select
to public
using (bucket_id = 'stickers');

drop policy if exists "stickers_owner_insert" on storage.objects;
create policy "stickers_owner_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'stickers'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "stickers_owner_update" on storage.objects;
create policy "stickers_owner_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'stickers'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'stickers'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "direct_chats_select_member" on public.direct_chats;
create policy "direct_chats_select_member"
on public.direct_chats for select
to authenticated
using (public.is_chat_member(id));

drop policy if exists "direct_chats_insert_self" on public.direct_chats;
create policy "direct_chats_insert_self"
on public.direct_chats for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "direct_chat_members_select_member" on public.direct_chat_members;
create policy "direct_chat_members_select_member"
on public.direct_chat_members for select
to authenticated
using (user_id = auth.uid() or public.is_chat_member(chat_id));

drop policy if exists "direct_chat_members_update_self" on public.direct_chat_members;
create policy "direct_chat_members_update_self"
on public.direct_chat_members for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
on public.messages for select
to authenticated
using (public.is_chat_member(chat_id));

drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.can_post_to_chat(chat_id)
);

drop policy if exists "messages_update_sender" on public.messages;
create policy "messages_update_sender"
on public.messages for update
to authenticated
using (sender_id = auth.uid() and public.is_chat_member(chat_id))
with check (sender_id = auth.uid() and public.is_chat_member(chat_id));

drop policy if exists "user_stickers_select_owner" on public.user_stickers;
create policy "user_stickers_select_owner"
on public.user_stickers for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "user_stickers_insert_owner" on public.user_stickers;
create policy "user_stickers_insert_owner"
on public.user_stickers for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "user_stickers_update_owner" on public.user_stickers;
create policy "user_stickers_update_owner"
on public.user_stickers for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "user_blocks_select_self" on public.user_blocks;
create policy "user_blocks_select_self"
on public.user_blocks for select
to authenticated
using (blocker_id = auth.uid() or blocked_id = auth.uid());

drop policy if exists "user_blocks_insert_self" on public.user_blocks;
create policy "user_blocks_insert_self"
on public.user_blocks for insert
to authenticated
with check (blocker_id = auth.uid());

drop policy if exists "user_blocks_delete_self" on public.user_blocks;
create policy "user_blocks_delete_self"
on public.user_blocks for delete
to authenticated
using (blocker_id = auth.uid());

drop policy if exists "call_logs_select_self" on public.call_logs;
create policy "call_logs_select_self"
on public.call_logs for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "call_logs_insert_self" on public.call_logs;
create policy "call_logs_insert_self"
on public.call_logs for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "call_logs_update_self" on public.call_logs;
create policy "call_logs_update_self"
on public.call_logs for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.start_direct_chat(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_chat uuid;
  new_chat uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid() = other_user then
    raise exception 'Cannot create a dialog with yourself';
  end if;

  select m1.chat_id into existing_chat
  from public.direct_chat_members m1
  join public.direct_chat_members m2 on m1.chat_id = m2.chat_id
  join public.direct_chats chats on chats.id = m1.chat_id
  where m1.user_id = auth.uid()
    and m2.user_id = other_user
    and chats.chat_type = 'direct'
    and (
      select count(*)
      from public.direct_chat_members members
      where members.chat_id = m1.chat_id
    ) = 2
  limit 1;

  if existing_chat is not null then
    return existing_chat;
  end if;

  insert into public.direct_chats default values returning id into new_chat;

  insert into public.direct_chat_members (chat_id, user_id)
  values
    (new_chat, auth.uid()),
    (new_chat, other_user);

  return new_chat;
end;
$$;

create or replace function public.create_room_chat(room_type text, room_title text, member_usernames text[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_chat uuid;
  target_user record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if room_type not in ('group', 'channel') then
    raise exception 'Room type must be group or channel';
  end if;

  if length(trim(coalesce(room_title, ''))) = 0 then
    raise exception 'Room title is required';
  end if;

  insert into public.direct_chats (chat_type, title, created_by)
  values (room_type, trim(room_title), auth.uid())
  returning id into new_chat;

  insert into public.direct_chat_members (chat_id, user_id, role)
  values (new_chat, auth.uid(), 'owner');

  if member_usernames is not null then
    for target_user in
      select distinct id
      from public.profiles
      where username = any(member_usernames)
        and id <> auth.uid()
    loop
      insert into public.direct_chat_members (chat_id, user_id, role)
      values (new_chat, target_user.id, 'member')
      on conflict (chat_id, user_id) do nothing;
    end loop;
  end if;

  return new_chat;
end;
$$;

create or replace function public.ensure_favorites_chat()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_chat uuid;
  new_chat uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select chats.id into existing_chat
  from public.direct_chats chats
  join public.direct_chat_members members
    on members.chat_id = chats.id
   and members.user_id = auth.uid()
  where chats.chat_type = 'favorites'
    and chats.created_by = auth.uid()
  limit 1;

  if existing_chat is not null then
    return existing_chat;
  end if;

  insert into public.direct_chats (chat_type, title, created_by)
  values ('favorites', 'Избранное', auth.uid())
  returning id into new_chat;

  insert into public.direct_chat_members (chat_id, user_id, role)
  values (new_chat, auth.uid(), 'owner')
  on conflict (chat_id, user_id) do nothing;

  return new_chat;
end;
$$;

create or replace function public.add_chat_member(target_chat uuid, member_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  target_chat_type text;
  target_owner uuid;
  requester_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select chat_type, created_by
    into target_chat_type, target_owner
  from public.direct_chats
  where id = target_chat;

  if target_chat_type is null then
    raise exception 'Chat not found';
  end if;

  if target_chat_type not in ('group', 'channel') then
    raise exception 'Members can be managed only in groups and channels';
  end if;

  select role
    into requester_role
  from public.direct_chat_members
  where chat_id = target_chat
    and user_id = auth.uid();

  if target_owner is distinct from auth.uid() and coalesce(requester_role, 'member') <> 'owner' then
    raise exception 'Only chat owner can manage members';
  end if;

  select id
    into target_user_id
  from public.profiles
  where username = lower(trim(coalesce(member_username, '')));

  if target_user_id is null then
    raise exception 'User not found';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Owner is already in this chat';
  end if;

  insert into public.direct_chat_members (chat_id, user_id, role)
  values (target_chat, target_user_id, 'member')
  on conflict (chat_id, user_id) do nothing;
end;
$$;

create or replace function public.remove_chat_member(target_chat uuid, member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_chat_type text;
  target_owner uuid;
  requester_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select chat_type, created_by
    into target_chat_type, target_owner
  from public.direct_chats
  where id = target_chat;

  if target_chat_type is null then
    raise exception 'Chat not found';
  end if;

  if target_chat_type not in ('group', 'channel') then
    raise exception 'Members can be managed only in groups and channels';
  end if;

  select role
    into requester_role
  from public.direct_chat_members
  where chat_id = target_chat
    and user_id = auth.uid();

  if target_owner is distinct from auth.uid() and coalesce(requester_role, 'member') <> 'owner' then
    raise exception 'Only chat owner can manage members';
  end if;

  if member_id = auth.uid() or member_id = target_owner then
    raise exception 'Owner cannot be removed from own chat';
  end if;

  delete from public.direct_chat_members
  where chat_id = target_chat
    and user_id = member_id;
end;
$$;

grant execute on function public.start_direct_chat(uuid) to authenticated;
grant execute on function public.is_chat_member(uuid) to authenticated;
grant execute on function public.can_post_to_chat(uuid) to authenticated;
grant execute on function public.create_room_chat(text, text, text[]) to authenticated;
grant execute on function public.ensure_favorites_chat() to authenticated;
grant execute on function public.add_chat_member(uuid, text) to authenticated;
grant execute on function public.remove_chat_member(uuid, uuid) to authenticated;
