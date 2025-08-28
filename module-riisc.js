{
    "use strict";

    console.log("✅ Module RIISC chargé et exécuté");

    // --- Traductions locales ---
    const t = (s, o) => I18n.translate(`vehicleChanges.${s}`);
    I18n.translations.fr_FR.vehicleChanges = {
        ids: { segLeader: [27] },
        close: "Fermer",
        title: "RIISC - Réglage Véhicules",
        tabs: { segLeader: "", GeneralSettings: "" },
        settingsForAll: "%{category}",
        setSettings: "Tout sauvegarder",
        ignoreOwned: "Ignorer la flotte existante",
        staff: "0",
        assignCesdtoCell: "Assigner CESD au VPCE",
        assignTeodortoCell: "Assigner TEODOR au VDSC",
        assignCedmtoCell: "Assigner CEDM au VPCE",
        assignUpmtoCell: "Assigner UPM au VPCE",
        assignMaitoCell: "Assigner MAI au VPCE",
        assignMsavsevtoCell: "Assigner MSAV-SEV au VPCE",
        doneTitle: "Achat de véhicules et Cellules attribués",
        doneOk: "OK"
    };

    // --- Ajout lien Paramétrage ---
    const menuProfile = document.querySelector("ul .dropdown-menu[aria-labelledby='menu_profile']");
    if(menuProfile && !document.getElementById("veChOpenModal")) {
        const li = document.createElement("li");
        li.role = "presentation";
        li.innerHTML = `<a id="veChOpenModal" style="cursor:pointer"><span class="glyphicon glyphicon-cog"></span> ${t("title")}</a>`;
        menuProfile.appendChild(li);
    }

    // --- Variables modal & page bâtiment ---
    const currentBuildingId = location.pathname.split("/")[2];
    const storageKey     = "vehicle_config_global_0";
    const ignoreOwnedKey = "vehicle_config_ignore_owned";
    const assignKeys = {
        cesd:   "vehicle_config_assign_cesd_vpce",
        teodor: "vehicle_config_assign_teodor_vdsc",
        cedm:   "vehicle_config_assign_cedm_vpce",
        upm:    "vehicle_config_assign_upm_vpce",
        mai:    "vehicle_config_assign_mai_vpce",
        msavsev:"vehicle_config_assign_msavsev_vpce"
    };

    // --- Packs de véhicules UIISC (bâtiment 27) ---
    const vehicleGroupsByBuilding = {
        27: {
            col1: { title: "⚙️ Commandement & NRBC", vehicles: [[61, "MAGEC"], [62, "VDIP"]] },
            col2: { title: "🔧 Cellules",            vehicles: [[112, "CEDM"], [107, "CESD"]] },
            col3: { title: "🚚 Cyno & FDF",          vehicles: [[68, "VEC"], [72, "UFR"],[95, "CCFS (R.I.I.S.C.)"],[96, "CCFM (R.I.I.S.C.)"],[97, "CCFL (R.I.I.S.C.)"]] },
            col4: { title: "🚒 Véhic. + Déminage",   vehicles: [[73, "VPCE"], [64, "VDSC"], [65, "TEODOR"], [66, "VTPSC"]] },
            col5: { title: "🛠️ Inondation",         vehicles: [[111, "UPM"], [70, "MAI"], [69, "MSAV-SEV"]] }
        }
    };

    // --- Création modal ---
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    Object.assign(overlay.style, {position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:10000,display:"none"});
    document.body.appendChild(overlay);

    const modal = document.createElement("div");
    modal.className = "modal-custom";
    Object.assign(modal.style, {position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#3b3b3b",color:"#fff",border:"2px solid #222",padding:"20px",width:"1200px",maxHeight:"90vh",overflow:"auto",borderRadius:"8px",zIndex:10001,boxShadow:"0 0 12px rgba(0,0,0,.6)",display:"none"});
    document.body.appendChild(modal);

    modal.innerHTML = `
        <h3>${t("title")}</h3>
        <form id="vehicle-config-form">
            <div id="vehicle-columns" style="display:flex;gap:15px;justify-content:space-between;flex-wrap:wrap"></div>
            <div style="margin-top:10px;">
                <label style="color:#ddd;">
                    <input type="checkbox" id="ignore-owned-checkbox"> ${I18n.t("vehicleChanges.ignoreOwned")}
                </label>
            </div>
            ${["cesd","teodor","cedm","upm","mai","msavsev"].map(key => `
                <div style="margin-top:6px;">
                    <label style="color:#ddd;">
                        <input type="checkbox" id="assign-${key}-checkbox"> ${I18n.t(`vehicleChanges.assign${key.charAt(0).toUpperCase()+key.slice(1)}toCell`)}
                    </label>
                </div>`).join("")}
            <div style="text-align:right;margin-top:10px;">
                <button type="submit" class="btn btn-success">💾 Sauvegarder</button>
                <button type="button" id="close-modal" class="btn btn-default">Annuler</button>
            </div>
        </form>
    `;

    // --- Construction colonnes ---
    function buildGroup(g){
        return `<div style="flex:1;background:#2b2b2b;padding:10px;border-radius:6px;min-width:200px"><h4 style="margin:5px 0 10px;color:#f5c542;text-align:center;border-bottom:1px solid #777;padding-bottom:4px">${g.title}</h4>`+
            g.vehicles.map(([id,name])=>`
                <label style="display:flex;align-items:center;font-size:13px;margin:4px 0;gap:6px">
                    <span style="min-width:120px"><input type="checkbox" class="vehicle-checkbox" data-id="${id}"> ${name}</span>
                    <input type="number" class="vehicle-quantity"  data-id="${id}" value="0" min="0" disabled style="width:30px;text-align:right;background:#eee;border-radius:3px;border:none;padding:2px 4px">
                    <input type="number" class="vehicle-personnel" data-id="${id}" value="" min="0" placeholder="${t("staff")}" style="width:30px;text-align:right;background:#d6eaff;border-radius:3px;border:none;padding:2px 4px">
                </label>`).join("")+`</div>`;
    }

    function renderColumns(){
        const cols = modal.querySelector("#vehicle-columns");
        cols.innerHTML = Object.values(vehicleGroupsByBuilding[27]).map(buildGroup).join("");
        cols.querySelectorAll(".vehicle-checkbox").forEach(cb => {
            cb.addEventListener("change", ()=>{
                const id = cb.dataset.id;
                cols.querySelector(`.vehicle-quantity[data-id="${id}"]`).disabled = !cb.checked;
            });
        });
    }
    renderColumns();

    // --- Fonctions stockage ---
    function loadConfig(){
        const data = JSON.parse(localStorage.getItem(storageKey) || "[]");
        modal.querySelectorAll(".vehicle-checkbox").forEach(cb => {
            const id = +cb.dataset.id;
            const rec = data.find(r=>r[0]===id);
            const qtyI = modal.querySelector(`.vehicle-quantity[data-id="${id}"]`);
            const perI = modal.querySelector(`.vehicle-personnel[data-id="${id}"]`);
            if(rec){
                cb.checked = true;
                qtyI.value = rec[1]??0; qtyI.disabled = false;
                perI.value = rec[2]??"";
            } else {
                cb.checked = false;
                qtyI.value = 0; qtyI.disabled = true;
                perI.value = "";
            }
        });
        modal.querySelector("#ignore-owned-checkbox").checked = localStorage.getItem(ignoreOwnedKey) === "true";
        Object.entries(assignKeys).forEach(([key,k])=>{
            modal.querySelector(`#assign-${key}-checkbox`).checked = localStorage.getItem(k) === "true";
        });
    }

    function hasConfig(){
        return JSON.parse(localStorage.getItem(storageKey)||"[]").length>0;
    }

    function saveConfig(){
        const cfg=[];
        modal.querySelectorAll(".vehicle-checkbox").forEach(cb=>{
            const id=+cb.dataset.id;
            const qty=+modal.querySelector(`.vehicle-quantity[data-id="${id}"]`).value;
            const persStr=modal.querySelector(`.vehicle-personnel[data-id="${id}"]`).value;
            const pers=persStr===""?0:+persStr;
            if(cb.checked&&(qty>0||pers>0)) cfg.push([id,qty,pers]);
        });
        localStorage.setItem(storageKey,JSON.stringify(cfg));
        localStorage.setItem(ignoreOwnedKey,modal.querySelector("#ignore-owned-checkbox").checked);
        Object.entries(assignKeys).forEach(([key,k])=>{
            localStorage.setItem(k,modal.querySelector(`#assign-${key}-checkbox`).checked);
        });
    }

    // --- Boutons page bâtiment ---
    const topWrapper=document.querySelector("h1")?.parentElement?.parentElement;
    const paramBtn = document.getElementById("veChOpenModal");
    const buyBtn   = document.createElement("a");
    buyBtn.className="btn btn-success btn-xs"; buyBtn.textContent="Acheter véhicules"; buyBtn.style.margin="5px";
    const staffBtn = document.createElement("a");
    staffBtn.className="btn btn-info btn-xs"; staffBtn.textContent="Modifier personnel"; staffBtn.style.margin="5px";

    if(topWrapper){ topWrapper.prepend(staffBtn,buyBtn); }

    // --- Ouverture / fermeture modal ---
    if(paramBtn) paramBtn.onclick=()=>{ overlay.style.display=modal.style.display="block"; loadConfig(); };
    modal.querySelector("#close-modal").onclick=()=>{ overlay.style.display=modal.style.display="none"; };

    // --- Sauvegarde ---
    modal.querySelector("#vehicle-config-form").addEventListener("submit",e=>{
        e.preventDefault(); saveConfig();
        alert("Configuration sauvegardée");
        overlay.style.display=modal.style.display="none";
        buyBtn.style.display = staffBtn.style.display = hasConfig() ? "inline-block":"none";
    });

    buyBtn.style.display = staffBtn.style.display = hasConfig() ? "inline-block":"none";

    // --- Achat véhicules + attribution ---
    const delay=ms=>new Promise(r=>setTimeout(r,ms));
    async function pairTrailers(trailerId,towId,csrfToken){
        const vehicles=await $.getJSON("/api/vehicles");
        const trailers=vehicles.filter(v=>v.vehicle_type===trailerId && v.building_id==currentBuildingId);
        const towing  =vehicles.filter(v=>v.vehicle_type===towId   && v.building_id==currentBuildingId);
        const used = new Set(vehicles.filter(v=>v.tractive_vehicle_id).map(v=>v.tractive_vehicle_id));
        for(const trailer of trailers){
            if(trailer.tractive_vehicle_id) continue;
            const freeTow = towing.find(t=>!used.has(t.id));
            if(!freeTow) break;
            await $.post(`/vehicles/${trailer.id}`,{"_method":"put","authenticity_token":csrfToken,"vehicle[tractive_random]":0,"vehicle[tractive_vehicle_id]":freeTow.id});
            used.add(freeTow.id);
            await delay(150);
        }
    }

    async function assignFunctions(csrf){
        if(localStorage.getItem(assignKeys.cesd)==="true") await pairTrailers(107,73,csrf);
        if(localStorage.getItem(assignKeys.teodor)==="true") await pairTrailers(65,64,csrf);
        if(localStorage.getItem(assignKeys.cedm)==="true") await pairTrailers(112,73,csrf);
        if(localStorage.getItem(assignKeys.upm)==="true") await pairTrailers(111,73,csrf);
        if(localStorage.getItem(assignKeys.mai)==="true") await pairTrailers(70,73,csrf);
        if(localStorage.getItem(assignKeys.msavsev)==="true") await pairTrailers(69,73,csrf);
    }

    buyBtn.onclick=async()=>{
        const cfg=JSON.parse(localStorage.getItem(storageKey)||"[]");
        if(!cfg.length){ return alert("Aucune configuration enregistrée."); }
        const csrf = document.querySelector("meta[name='csrf-token']").content;
        const ignoreOwned = localStorage.getItem(ignoreOwnedKey) === "true";
        const owned = ignoreOwned?[]:Array.from(document.querySelectorAll("img[vehicle_type_id]")).map(img=>+img.getAttribute("vehicle_type_id"));

        for(const [typeId,qty] of cfg){
            const already = owned.filter(id=>id===typeId).length;
            const toBuy = ignoreOwned? qty: Math.max(0, qty - already);
            for(let i=0;i<toBuy;i++){
                await fetch(`/buildings/${currentBuildingId}/vehicle/${currentBuildingId}/${typeId}/credits?building=${currentBuildingId}`,{
                    method:"POST",
                    headers:{'Content-Type':'application/x-www-form-urlencoded'},
                    body:`_method=get&authenticity_token=${encodeURIComponent(csrf)}`
                });
                await delay(100);
            }
        }
        await assignFunctions(csrf);
        alert("Achat et attribution terminés !");
        location.reload();
    };

    // --- Modifier personnel ---
    staffBtn.onclick=async()=>{
        const cfg=JSON.parse(localStorage.getItem(storageKey)||"[]");
        if(!cfg.length){ return alert("Aucune configuration enregistrée."); }
        const desired = Object.fromEntries(cfg.filter(r=>r[2]>0).map(r=>[r[0],r[2]]));
        if(!Object.keys(desired).length){ return alert("Aucun nombre de personnes défini."); }

        const rows=document.querySelectorAll("#vehicle_table tbody tr");
        if(!rows.length) return alert("Tableau des véhicules non détecté.");
        const csrf = document.querySelector("meta[name='csrf-token']").content;

        for(const row of rows){
            const typeId = +row.querySelector("td img[vehicle_type_id]")?.getAttribute("vehicle_type_id");
            const vehId  = row.querySelector("td:nth-child(2) a")?.getAttribute("href").replace(/[^0-9]/g,"");
            const curMax = parseInt(row.querySelector("td:nth-child(6)")?.innerText.trim());
            if(desired[typeId] && desired[typeId]!==curMax){
                await fetch(`/vehicles/${vehId}`,{
                    method:"POST",
                    headers:{'Content-Type':'application/x-www-form-urlencoded'},
                    body:`vehicle[personal_max]=${desired[typeId]}&_method=put&authenticity_token=${encodeURIComponent(csrf)}`
                });
                await delay(150);
            }
        }
        alert("Nombre de personnes mis à jour.");
        location.reload();
    };

})();
