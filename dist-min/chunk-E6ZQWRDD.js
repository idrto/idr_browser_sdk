async function s(r,o){r.replaceChildren();let e=document.createElement("div");e.className="idr-auth-panel",e.innerHTML=`
    <style>
      .idr-auth-panel { font-family: system-ui, sans-serif; max-width: 360px; }
      .idr-auth-panel h3 { margin: 0 0 12px; font-size: 1rem; }
      .idr-auth-panel label { display: block; font-size: 0.85rem; margin: 8px 0 4px; }
      .idr-auth-panel input { width: 100%; box-sizing: border-box; padding: 8px; }
      .idr-auth-panel button { margin-top: 12px; padding: 8px 12px; cursor: pointer; }
      .idr-auth-panel .panel { border: 1px solid #ccc; padding: 12px; }
      .idr-auth-panel .error { color: #b00020; font-size: 0.85rem; margin-top: 8px; }
      .idr-auth-panel .remember { margin-top: 8px; font-size: 0.85rem; }
    </style>
    <h3>Connect to idr.to</h3>
    <div class="panel">
      <label>Entity ID</label>
      <input type="email" name="entity" autocomplete="username" />
      <label>Password</label>
      <input type="password" name="password" autocomplete="current-password" />
      <label class="remember"><input type="checkbox" name="persist-account" /> Remember in this browser</label>
      <button type="button" data-action="login-account">Sign in</button>
    </div>
    <div class="error" hidden></div>
  `,r.appendChild(e);let a=e.querySelector(".error"),i=t=>{a.hidden=!t,a.textContent=t;};e.querySelector('[data-action="login-account"]').addEventListener("click",async()=>{i("");let t=e.querySelector('input[name="entity"]').value,l=e.querySelector('input[name="password"]').value,p=e.querySelector('input[name="persist-account"]').checked;try{await o.client.loginAccount({entityId:t,password:l,persist:p});}catch(n){i(n instanceof Error?n.message:String(n));}});}export{s as a};