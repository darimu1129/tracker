const MAX_POKEMON = 721;
const GEN_RANGES = {1:[1,151],2:[152,251],3:[252,386],4:[387,493],5:[494,649],6:[650,721]};
const STORAGE_KEY = 'nuzlocke-boss-editor-v1';

let pokemon = [];
let bosses = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let selectedBoss = null;

const $ = id => document.getElementById(id);
const slug = id => String(id).padStart(3,'0');
const sprite = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

function saveAll(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(bosses)); }
function genOf(id){ for(const [g,[a,b]] of Object.entries(GEN_RANGES)) if(id>=a&&id<=b) return Number(g); return 0; }

async function loadPokemon(){
  // The list is generated from the National Dex IDs 001-721. Names/types are
  // fetched from PokeAPI so the editor stays small while covering all Gen 1-6.
  $('pokemonResults').innerHTML = '<div class="empty-team">Cargando Pokémon 001–721…</div>';
  try{
    const r = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${MAX_POKEMON}`);
    const data = await r.json();
    pokemon = data.results.map((p,i)=>({id:i+1,name:p.name}));
    renderPokemon();
  }catch(e){
    pokemon = Array.from({length:MAX_POKEMON},(_,i)=>({id:i+1,name:`Pokémon #${slug(i+1)}`}));
    renderPokemon();
  }
}

function renderBosses(){
  $('bossCount').textContent = bosses.length;
  $('bossList').innerHTML = '';
  bosses.forEach((b,i)=>{
    const btn=document.createElement('button');
    btn.className='boss-button'+(selectedBoss===i?' active':'');
    btn.innerHTML=`<strong>${escapeHtml(b.name||`Boss ${i+1}`)}</strong><small>${b.team.length}/6 Pokémon</small>`;
    btn.onclick=()=>selectBoss(i);
    $('bossList').appendChild(btn);
  });
}

function selectBoss(i){ selectedBoss=i; $('emptyState').hidden=true; $('bossEditor').hidden=false; renderBosses(); renderEditor(); }
function createBoss(){ bosses.push({name:`Boss ${bosses.length+1}`,team:[]}); saveAll(); selectBoss(bosses.length-1); }

function renderEditor(){
  const b=bosses[selectedBoss]; if(!b) return;
  $('bossName').value=b.name||''; $('teamCount').textContent=`${b.team.length}/6`;
  $('team').innerHTML='';
  if(!b.team.length) $('team').innerHTML='<div class="empty-team">Añade Pokémon desde el buscador de arriba.</div>';
  b.team.forEach((member,index)=>{
    const p=pokemon.find(x=>x.id===member.id)||{id:member.id,name:member.name};
    const card=document.getElementById('teamCardTemplate').content.cloneNode(true);
    const el=card.querySelector('.team-card');
    card.querySelector('.sprite').src=sprite(p.id); card.querySelector('.sprite').alt=p.name;
    card.querySelector('.poke-name').textContent=`#${slug(p.id)} ${cap(p.name)}`;
    card.querySelector('.level').value=member.level||50;
    card.querySelector('.ability').value=member.ability||'';
    card.querySelector('.item').value=member.item||'';
    card.querySelector('.moves').value=member.moves||'';
    card.querySelector('.remove').onclick=()=>{b.team.splice(index,1);saveAll();renderEditor();};
    ['level','ability','item','moves'].forEach(key=>card.querySelector('.'+key).oninput=e=>{member[key]=e.target.value;saveAll();});
    $('team').appendChild(card);
  });
}

function renderPokemon(){
  const q=$('pokemonSearch').value.trim().toLowerCase();
  const gf=$('generationFilter').value;
  const b=bosses[selectedBoss];
  const list=pokemon.filter(p=>{
    const matchesQ=!q || p.name.includes(q) || String(p.id)===q.replace(/^#/,'') || slug(p.id)===q.replace(/^#/,'');
    const matchesG=gf==='all'||String(genOf(p.id))===gf;
    return matchesQ&&matchesG;
  }).slice(0,60);
  $('pokemonResults').innerHTML='';
  if(!list.length){$('pokemonResults').innerHTML='<div class="empty-team">No se encontraron Pokémon.</div>';return;}
  list.forEach(p=>{
    const inTeam=b?.team.some(x=>x.id===p.id);
    const btn=document.createElement('button'); btn.className='poke-option'; btn.disabled=!!inTeam||!b||b.team.length>=6;
    btn.innerHTML=`<img src="${sprite(p.id)}" alt=""><span><strong>#${slug(p.id)} ${cap(p.name)}</strong><em>Gen ${genOf(p.id)}${inTeam?' · En equipo':''}</em></span>`;
    btn.onclick=()=>addPokemon(p.id); $('pokemonResults').appendChild(btn);
  });
}
function addPokemon(id){
  const b=bosses[selectedBoss]; if(!b||b.team.length>=6||b.team.some(x=>x.id===id))return;
  const p=pokemon.find(x=>x.id===id); b.team.push({id,name:p?.name||`Pokemon #${id}`,level:50,ability:'',item:'',moves:''}); saveAll(); renderEditor(); renderPokemon();
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cap(s){return String(s).split('-').map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join('-');}

$('newBoss').onclick=createBoss; $('emptyNewBoss').onclick=createBoss;
$('pokemonSearch').oninput=renderPokemon; $('generationFilter').onchange=renderPokemon;
$('bossName').oninput=e=>{if(selectedBoss!==null){bosses[selectedBoss].name=e.target.value;saveAll();renderBosses();}};
$('saveBoss').onclick=()=>{saveAll();renderBosses();$('saveBoss').textContent='Guardado ✓';setTimeout(()=>$('saveBoss').textContent='Guardar Boss',1000);};
$('deleteBoss').onclick=()=>{if(selectedBoss===null)return;if(confirm('¿Eliminar este Boss?')){bosses.splice(selectedBoss,1);saveAll();selectedBoss=null;renderBosses();$('bossEditor').hidden=true;$('emptyState').hidden=false;}};

renderBosses();
if(bosses.length) selectBoss(0);
loadPokemon();