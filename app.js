const API_URL="https://script.google.com/macros/s/AKfycbzs8fORPzBKp8zX84kt_nHqLjyU8duD1BYLR630eLUbAZcsPPAEnnhvWH7jq0kg3Ply/exec";
let DATA={success:true,dashboard:{},income:[],expenses:[],bankAccounts:[],assets:[],pf:{records:[],balance:0},ppf:{records:[],balance:0},mutualFunds:[],stocks:[],creditCards:[],loans:[],bills:[]};
let charts={};

const money=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(n)||0);
const num=n=>Number(n)||0;
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const field=(o,...keys)=>{for(const k of keys)if(o&&o[k]!==undefined&&o[k]!==null&&o[k]!=="")return o[k];return""};
const dateFmt=v=>{if(!v)return"—";const d=new Date(v);return isNaN(d) ? esc(v):d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})};
const sum=(arr,...keys)=>arr.reduce((a,r)=>a+num(field(r,...keys)),0);

async function loadAllData(){
  showLoading(true); hideError();
  try{
    const res=await fetch(API_URL+"?action=getAllData",{cache:"no-store"});
    if(!res.ok)throw new Error("Backend returned HTTP "+res.status);
    const json=await res.json();
    if(!json.success)throw new Error(json.error||"Backend returned an error");
    DATA={...DATA,...json};
    renderAll();
    document.getElementById("lastUpdated").textContent="Last updated "+new Date().toLocaleString("en-IN");
  }catch(e){
    showError("Could not load your data. "+e.message+" — First open your Apps Script URL with ?action=getAllData and confirm it returns JSON.");
  }finally{showLoading(false)}
}

function showLoading(v){document.getElementById("loading").classList.toggle("hidden",!v);document.getElementById("app").classList.toggle("hidden",v)}
function showError(msg){const e=document.getElementById("errorBox");e.textContent=msg;e.classList.remove("hidden")}
function hideError(){document.getElementById("errorBox").classList.add("hidden")}
function toggleSidebar(){document.getElementById("sidebar").classList.toggle("open")}

function renderAll(){renderDashboard();renderIncome();renderExpenses();renderBanks();renderAssets();renderInvestments();renderCards();renderLoans();renderBills();}

function renderDashboard(){
 const d=DATA.dashboard||{};
 const net=num(d.netWorth), assets=num(d.totalAssets), liab=num(d.totalLiabilities);
 document.getElementById("dashboardPage").innerHTML=`
 <div class="hero"><div class="hero-label">TOTAL NET WORTH</div><div class="hero-value">${money(net)}</div><div class="hero-sub">Assets ${money(assets)} − Liabilities ${money(liab)}</div></div>
 <div class="grid cards">
  ${metric("Cash Balance",d.cashBalance,"Cash available")}
  ${metric("Bank Balance",d.bankBalance,"All bank accounts")}
  ${metric("Total Assets",assets,"Including investments")}
  ${metric("Liabilities",liab,"Cards + loans")}
  ${metric("PF Balance",d.pfBalance,"Employee provident fund")}
  ${metric("PPF Balance",d.ppfBalance,"Public provident fund")}
  ${metric("Mutual Funds",d.mutualFundValue,"Current portfolio value")}
  ${metric("Stocks",d.stockValue,"Current portfolio value")}
 </div>
 <div class="grid two">
  <div class="card chart-card"><h3 class="section-title">Income vs Expenses</h3><div class="chart-wrap"><canvas id="cashChart"></canvas></div></div>
  <div class="card chart-card"><h3 class="section-title">Asset Allocation</h3><div class="chart-wrap"><canvas id="assetChart"></canvas></div></div>
 </div>
 <div class="grid two" style="margin-top:16px">
  <div class="card"><h3 class="section-title">Bank Balances</h3>${bankRows()}</div>
  <div class="card"><h3 class="section-title">Upcoming / Overdue</h3>${billNotices()}${emiNotices()}${cardNotices()}</div>
 </div>
 <div class="grid two" style="margin-top:16px">
  <div class="card"><h3 class="section-title">Recent Income</h3>${simpleRecent(DATA.income,"income")}</div>
  <div class="card"><h3 class="section-title">Recent Expenses</h3>${simpleRecent(DATA.expenses,"expense")}</div>
 </div>`;
 drawDashboardCharts();
}
function metric(label,value,sub){return `<div class="card"><div class="label">${label}</div><div class="value">${money(value)}</div><div class="muted">${sub}</div></div>`}

function drawDashboardCharts(){
 Object.values(charts).forEach(c=>c?.destroy());charts={};
 const c1=document.getElementById("cashChart"),c2=document.getElementById("assetChart");if(!c1||!c2)return;
 charts.cash=new Chart(c1,{type:"bar",data:{labels:["Income","Expenses","Net Cash Flow"],datasets:[{label:"Amount",data:[num(DATA.dashboard.totalIncome),num(DATA.dashboard.totalExpenses),num(DATA.dashboard.netCashFlow)]}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:v=>money(v)}}}}});
 const d=DATA.dashboard;
 charts.asset=new Chart(c2,{type:"doughnut",data:{labels:["Cash","Banks","PF","PPF","Mutual Funds","Stocks","Other Assets"],datasets:[{data:[num(d.cashBalance),num(d.bankBalance),num(d.pfBalance),num(d.ppfBalance),num(d.mutualFundValue),num(d.stockValue),num(d.otherAssets)]}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}});
}
function bankRows(){if(!DATA.bankAccounts.length)return empty("No bank accounts found.");return DATA.bankAccounts.map(b=>`<div class="balance-row"><span>${esc(field(b,"Account_Name","Account Name","Bank_Name","Bank Name"))}</span><strong>${money(field(b,"Current_Balance"))}</strong></div>`).join("")}
function simpleRecent(a,type){if(!a.length)return empty("No records found.");return a.slice(-6).reverse().map(r=>`<div class="balance-row"><span><strong>${esc(field(r,"Income_Source","Income Source","Category"))}</strong><br><small>${dateFmt(field(r,"Date","date"))}</small></span><strong class="${type==="income"?"positive":"negative"}">${type==="income"?"+":"−"}${money(field(r,"Amount","amount"))}</strong></div>`).join("")}
function billNotices(){const today=new Date();return DATA.bills.filter(b=>String(field(b,"Status","status")).toUpperCase()!=="PAID").slice(0,3).map(b=>`<div class="notice">⚡ ${esc(field(b,"Bill_Name","Bill Name"))} · ${money(field(b,"Amount"))} · Due ${dateFmt(field(b,"Due_Date","Due Date"))}</div>`).join("")}
function emiNotices(){return DATA.loans.slice(0,3).map(l=>`<div class="notice">🏠 ${esc(field(l,"Loan_Name","Loan Name"))} · Outstanding ${money(field(l,"Calculated_Outstanding"))}</div>`).join("")}
function cardNotices(){return DATA.creditCards.filter(c=>num(c.Current_Outstanding)>0).slice(0,3).map(c=>`<div class="notice">💳 ${esc(field(c,"Card_Name","Card Name"))} · Outstanding ${money(c.Current_Outstanding)}</div>`).join("")}
function empty(t){return `<div class="empty">${t}</div>`}

function table(title,desc,headers,rows){return `<div class="page-head"><div><h2>${title}</h2><p>${desc}</p></div></div><div class="card table-card"><div class="table-scroll"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}"><div class="empty">No data found</div></td></tr>`}</tbody></table></div></div>`}
function tr(cells){return `<tr>${cells.map(x=>`<td>${x}</td>`).join("")}</tr>`}

function renderIncome(){document.getElementById("incomePage").innerHTML=table("Income","All income records stored in Google Sheets.",["Date","Source","Category","Amount","Mode","Account","Description"],DATA.income.map(r=>tr([dateFmt(field(r,"Date","date")),esc(field(r,"Income_Source","Income Source")),esc(field(r,"Category")),`<strong class="positive">+${money(field(r,"Amount","amount"))}</strong>`,esc(field(r,"Mode","mode")),esc(field(r,"Account","account")),esc(field(r,"Description","description"))])).join(""))}
function renderExpenses(){document.getElementById("expensesPage").innerHTML=table("Expenses","All expense records stored in Google Sheets.",["Date","Category","Amount","Mode","Account","Description"],DATA.expenses.map(r=>tr([dateFmt(field(r,"Date","date")),esc(field(r,"Category")),`<strong class="negative">−${money(field(r,"Amount","amount"))}</strong>`,esc(field(r,"Mode","mode")),esc(field(r,"Account","account")),esc(field(r,"Description","description"))])).join(""))}
function renderBanks(){document.getElementById("banksPage").innerHTML=table("Bank Accounts","Every bank account with calculated current balance.",["Bank / Account","Type","Opening Balance","Current Balance"],DATA.bankAccounts.map(r=>tr([esc(field(r,"Account_Name","Account Name","Bank_Name","Bank Name")),esc(field(r,"Account_Type","Account Type")),money(field(r,"Opening_Balance","Opening Balance")),`<strong>${money(field(r,"Current_Balance"))}</strong>`])).join(""))}
function renderAssets(){document.getElementById("assetsPage").innerHTML=table("Personal Assets","Current values included in total net worth.",["Asset","Type","Purchase Date","Purchase Value","Current Value"],DATA.assets.map(r=>tr([esc(field(r,"Asset_Name","Asset Name")),esc(field(r,"Asset_Type","Asset Type")),dateFmt(field(r,"Purchase_Date","Purchase Date")),money(field(r,"Purchase_Value","Purchase Value")),`<strong>${money(field(r,"Current_Value","Current Value"))}</strong>`])).join(""))}
function renderInvestments(){
 const mf=DATA.mutualFunds||[],st=DATA.stocks||[];
 document.getElementById("investmentsPage").innerHTML=`<div class="grid two">
 ${table("Mutual Funds","Portfolio calculated from BUY/SELL transactions.",["Fund","Units","Invested","Current Value","Profit"],mf.map(r=>tr([esc(r.name),num(r.units).toFixed(3),money(r.invested),money(r.currentValue),`<strong class="${num(r.profit)>=0?"positive":"negative"}">${money(r.profit)}</strong>`])).join(""))}
 ${table("Stocks","Portfolio calculated from BUY/SELL transactions.",["Stock","Qty","Invested","Current Value","Profit"],st.map(r=>tr([esc(r.name),num(r.quantity),money(r.invested),money(r.currentValue),`<strong class="${num(r.profit)>=0?"positive":"negative"}">${money(r.profit)}</strong>`])).join(""))}
 </div>
 <div class="grid two" style="margin-top:16px"><div class="card"><h3 class="section-title">PF</h3><div class="value">${money(DATA.pf.balance)}</div><div class="muted">Contributions − withdrawals</div></div><div class="card"><h3 class="section-title">PPF</h3><div class="value">${money(DATA.ppf.balance)}</div><div class="muted">Contributions − withdrawals</div></div></div>`;
}
function renderCards(){document.getElementById("cardsPage").innerHTML=table("Credit Cards","Current outstanding and available limit.",["Card","Bank","Limit","Outstanding","Available","Due Date"],DATA.creditCards.map(r=>tr([esc(field(r,"Card_Name","Card Name")),esc(field(r,"Bank")),money(field(r,"Credit_Limit","Credit Limit")),`<strong class="${num(r.Current_Outstanding)>0?"negative":"positive"}">${money(r.Current_Outstanding)}</strong>`,money(r.Available_Limit),esc(field(r,"Payment_Due_Date","Payment Due Date"))])).join(""))}
function renderLoans(){document.getElementById("loansPage").innerHTML=table("Loans & EMIs","Loan balances calculated from the loan records and paid EMI records.",["Loan","Lender","EMI","Original Principal","Calculated Outstanding","Due Day"],DATA.loans.map(r=>tr([esc(field(r,"Loan_Name","Loan Name")),esc(field(r,"Lender")),money(field(r,"EMI_Amount","EMI Amount")),money(field(r,"Principal")),`<strong>${money(field(r,"Calculated_Outstanding"))}</strong>`,esc(field(r,"EMI_Due_Day","EMI Due Day"))])).join(""))}
function renderBills(){document.getElementById("billsPage").innerHTML=table("Bills","Electricity, Wi-Fi, mobile and other recurring bills.",["Bill","Type","Provider","Amount","Due Date","Frequency","Status"],DATA.bills.map(r=>tr([esc(field(r,"Bill_Name","Bill Name")),esc(field(r,"Bill_Type","Bill Type")),esc(field(r,"Provider")),money(field(r,"Amount")),dateFmt(field(r,"Due_Date","Due Date")),esc(field(r,"Frequency")),`<span class="badge">${esc(field(r,"Status","status")||"PENDING")}</span>`])).join(""))}

const pages={dashboard:"Dashboard",income:"Income",expenses:"Expenses",banks:"Bank Accounts",assets:"Assets",investments:"Investments",cards:"Credit Cards",loans:"Loans & EMIs",bills:"Bills"};
document.querySelectorAll(".nav").forEach(btn=>btn.addEventListener("click",()=>{const p=btn.dataset.page;document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));btn.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));document.getElementById(p+"Page").classList.remove("hidden");document.getElementById("pageTitle").textContent=pages[p];document.getElementById("sidebar").classList.remove("open")}));

loadAllData();
