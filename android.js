/* Android: установка PWA, офлайн-индикация, резервная копия через Share Sheet.
 * Пользовательские данные остаются в localStorage этого устройства.
 * Никакие запросы на отправку прогресса третьим лицам не делаются. */
(function(){
  "use strict";
  const KEY="ege2027-local-progress-v1";
  const isAndroid=/Android/i.test(navigator.userAgent||"");
  const secure=location.protocol==="https:"||["localhost","127.0.0.1"].includes(location.hostname);
  const standalone=()=>window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone===true;
  const $=q=>document.querySelector(q);
  let installEvent=null;
  let swRegistration=null;
  function dismissIsSaved(){try{return sessionStorage.getItem("ege-hide-install-help")==="1";}catch{return false;}}
  function info(message){
    const box=$("#android-status");
    if(box)box.textContent=message;
  }
  function statusText(){
    if(standalone())return "Установлено: открывается с иконки как приложение.";
    if(location.protocol==="file:")return "Открыто как файл. Для установки откройте размещённую HTTPS-версию.";
    if(!secure)return "Для установки нужен адрес HTTPS.";
    return installEvent?"Готово к установке на устройство.":"Откройте меню Chrome ⋮ → «Установить приложение» или «Установить и создать ярлык».";
  }
  function updateUI(){
    const installed=standalone();
    const installButton=$("#android-install-btn");
    if(installButton){installButton.hidden=installed;installButton.textContent=installEvent?"Установить на устройство":"Как установить";}
    const label=$("#android-install-hint");
    if(label)label.textContent=statusText();
    const banner=$("#android-pwa-banner");
    if(banner)banner.hidden=!isAndroid||installed||dismissIsSaved();
    const status=$("#android-connection");
    if(status){status.textContent=navigator.onLine?"Сеть доступна":"Без интернета";status.dataset.online=String(navigator.onLine);}
    const s=$("#android-offline-status");
    if(s)s.textContent=swRegistration?.active?"Основные страницы доступны офлайн. Внешние PDF и сайты требуют интернета.":
      secure?"Офлайн-режим подготовится после первой успешной загрузки страницы.":"Офлайн-установка доступна только по HTTPS.";
  }
  async function install(){
    if(standalone()){info("Приложение уже установлено.");return;}
    if(!secure){info("Для установки нужен HTTPS-адрес опубликованного приложения.");return;}
    if(installEvent){
      const ev=installEvent;installEvent=null;
      try{await ev.prompt();await ev.userChoice;}catch{ /* стандартное меню Chrome остаётся доступным */ }
    }else{
      info("В Chrome откройте меню ⋮ → «Установить приложение» / «Установить и создать ярлык».");
    }
    updateUI();
  }
  function downloadBackup(json,name){
    const blob=new Blob([json],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function shareBackup(){
    let parsed;
    try{parsed=JSON.parse(localStorage.getItem(KEY)||"null");}
    catch{info("Не удалось прочитать прогресс.");return;}
    if(!parsed||typeof parsed!=="object"){info("Сначала откройте программу и сохраните хотя бы одну запись.");return;}
    const iso=new Date().toISOString().slice(0,10);
    const filename="ege-2027-progress-"+iso+".json";
    const serialized=JSON.stringify({version:1,exportedAt:new Date().toISOString(),state:parsed},null,2);
    const file=typeof File!=="undefined"?new File([serialized],filename,{type:"application/json"}):null;
    if(file&&typeof navigator.share==="function"&&(!navigator.canShare||navigator.canShare({files:[file]}))){
      try{
        await navigator.share({files:[file],title:"Резервная копия ЕГЭ-2027",text:"Перенос учебного прогресса на другое устройство."});
        info("Файл передан выбранному вами приложению. На другом устройстве используйте «Импортировать JSON».");
        return;
      }catch(e){
        if(e?.name==="AbortError"){info("Передача отменена. Данные на устройстве сохранены.");return;}
      }
    }
    downloadBackup(serialized,filename);
    info("JSON сохранён в Загрузки. Передайте файл на другое устройство и импортируйте.");
  }
  function initialize(){
    const banner=$("#android-pwa-banner");
    if(banner&&isAndroid){
      banner.innerHTML='<div class="android-pwa-copy"><strong>Мой ЕГЭ на главном экране</strong><span>Установите один раз и запускайте без браузерных вкладок.</span></div>'+
        '<button class="btn small" type="button" data-android="install">Установить</button>'+
        '<button class="android-banner-close" aria-label="Скрыть совет" type="button" data-android="dismiss">×</button>';
    }
    document.addEventListener("click",event=>{
      const b=event.target.closest("button[data-android]");if(!b)return;
      if(b.dataset.android==="install")install();
      else if(b.dataset.android==="share")shareBackup();
      else if(b.dataset.android==="dismiss"){
        try{sessionStorage.setItem("ege-hide-install-help","1");}catch{}
        if(banner)banner.hidden=true;
      }
      else if(b.dataset.android==="go-import")$("#import-input")?.click();
    });
    window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installEvent=event;updateUI();});
    window.addEventListener("appinstalled",()=>{installEvent=null;updateUI();});
    window.addEventListener("online",updateUI);window.addEventListener("offline",updateUI);
    if("serviceWorker" in navigator && secure){
      navigator.serviceWorker.register("./sw.js",{scope:"./"}).then(reg=>{
        swRegistration=reg;updateUI();
      }).catch(()=>{info("Не удалось включить офлайн-режим. Проверьте HTTPS и обновите страницу.");updateUI();});
    }
    updateUI();
  }
  window.EGE_ANDROID={install,shareBackup,updateUI};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})();