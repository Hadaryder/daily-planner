(async function main(){
  render();
  try{await Store.init()}catch(e){console.error(e);try{Store.loadLocal()}catch(_){}}
  S.ready=true;
  try{if(S.mode==='db')await Social.init();else if(S.mode==='api'&&S.user&&S.profile){Social=SocialApi;await Social.init()}}catch(e){console.error(e)}
  render();
})();
