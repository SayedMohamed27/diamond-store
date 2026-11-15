(() => {
  const $ = (id) => document.getElementById(id);
  const config = window.DAIMOND_SUPABASE_CONFIG;
  const ready = Boolean(config?.url && config?.anonKey && !config.url.includes("YOUR-PROJECT-REF") && !config.anonKey.includes("YOUR_SUPABASE"));
  const show = (id) => { $(id).hidden = false; };
  const hide = (id) => { $(id).hidden = true; };
  if (!ready || !window.supabase?.createClient) { show("setupNotice"); return; }

  const client = window.supabase.createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  function message(target, text, isError = true) {
    $(target).textContent = text;
    $(target).style.color = isError ? "#a33b20" : "#237a43";
  }
  async function renderSession(session) {
    if (!session?.user) { hide("dashboardPanel"); show("loginPanel"); return; }
    const { data: admin, error } = await client.from("admin_users")
      .select("role, active").eq("user_id", session.user.id).maybeSingle();
    if (error || !admin?.active) {
      await client.auth.signOut();
      hide("dashboardPanel"); show("loginPanel");
      message("loginMessage", "الحساب ده مش معتمد كمسؤول للمتجر. تواصل مع مالك المشروع.");
      return;
    }
    hide("loginPanel"); show("dashboardPanel");
    $("signedInAs").textContent = `تم تسجيل الدخول: ${session.user.email} · الصلاحية: ${admin.role}`;
  }
  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("loginButton"); button.disabled = true; button.textContent = "جارٍ التحقق…";
    message("loginMessage", "", false);
    const { data, error } = await client.auth.signInWithPassword({
      email: $("email").value.trim(), password: $("password").value
    });
    button.disabled = false; button.textContent = "دخول آمن";
    if (error) { message("loginMessage", "تعذر تسجيل الدخول. راجع البريد وكلمة المرور أو إعدادات الحساب."); return; }
    await renderSession(data.session);
  });
  $("logoutButton").addEventListener("click", async () => {
    const { error } = await client.auth.signOut();
    if (error) message("dashboardMessage", "حصلت مشكلة أثناء تسجيل الخروج.");
    else { hide("dashboardPanel"); show("loginPanel"); message("loginMessage", "تم تسجيل الخروج بأمان.", false); }
  });
  client.auth.onAuthStateChange((_event, session) => { window.setTimeout(() => renderSession(session), 0); });
  client.auth.getSession().then(({ data }) => renderSession(data.session));
})();
