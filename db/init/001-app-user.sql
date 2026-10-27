do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user login password 'app_password' nosuperuser;
  end if;
end
$$;

grant connect on database review_responder to app_user;
