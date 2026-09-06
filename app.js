const API_URL="https://script.google.com/macros/s/AKfycbzs8fORPzBKp8zX84kt_nHqLjyU8duD1BYLR630eLUbAZcsPPAEnnhvWH7jq0kg3Ply/exec";
const state={dashboard:null,banks:[],income:[],expenses:[],assets:[],pf:null,ppf:null,mf:[],stocks:[],cards:[],loans:[],bills:[]};
let chart=null;

const $=s=>document.querySelector(s);
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const today=()=>new Date().toISOString().slice(0,10);

async function get(action){
  const r=await fetch(`${API_URL}?action=${encodeURIComponent(action)}`);
  const j=await r.json(); if(!j.success) throw Error(j.error||"Request failed"); return j.data;
}
async function post(payload){
  const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)});
  const j=await r.json(); if(!j.success) throw Error(j.error||"Could not save"); return j;
}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function formData(form){return Object.fromEntries(new FormData(form).entries())}
function showMsg(id,msg,ok=true){const x=$("#"+id);x.textContent=msg;x.style.color=ok?"#198754":"#d33";setTimeout(()=>x.textContent="",3000)}
function setToday(form){const x=form.querySelector('input[name="date"]');if(x&&!x.value)x.value=today()}

const pages={
 dashboard:["Dashboard","Your complete financial picture"],income:["Add Income","Record money received"],expenses:["Add Expense","Record spending"],banks:["Bank Accounts","Multiple accounts and live balances"],
 assets:["Assets","Your personal asset register"],investments:["Investments","PF, PPF, mutual funds and stocks"],cards:["Credit Cards","Usage, outstanding and payments"],loans:["Loans & EMIs","Loan balances and payment schedules"],bills:["Bills & Reminders","Never miss an important payment"]
};
function navigate(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  $("#page-"+page)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  $("#pageTitle").textContent=pages[page][0];$("#pageSubtitle").textContent=pages[page][1];
  $("#sidebar").classList.remove("open"); if(page==="dashboard")renderDashboard();
}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>navigate(b.dataset.page));
document.querySelectorAll("[data-page-jump]").forEach(b=>b.onclick=()=>navigate(b.dataset.pageJump));
$("#mobileMenu").onclick=()=>$("#sidebar").classList.toggle("open");
$("#refreshBtn").onclick=()=>loadAll();

async function loadAll(){
  try{
    const d=await get("getAllData");
    state.dashboard=d.dashboard;state.income=d.income||[];state.expenses=d.expenses||[];state.banks=d.bankAccounts||[];
    state.assets=d.assets||[];state.pf=d.pf||{balance:0};state.ppf=d.ppf||{balance:0};state.mf=d.mutualFunds||[];
    state.stocks=d.stocks||[];state.cards=d.creditCards||[];state.loans=d.loans||[];state.bills=d.bills||[];
    renderDashboard();renderBanks();renderAssets();renderInvestments();renderCards();renderLoans();renderBills();
    toast("Data refreshed");
  }catch(e){toast("Connection error: "+e.message)}
}

function renderDashboard(){
  const d=state.dashboard||{};
  $("#netWorth").textContent=money(d.netWorth);$("#totalAssets").textContent=money(d.totalAssets);$("#totalLiabilities").textContent=money(d.totalLiabilities);
  $("#totalIncome").textContent=money(d.totalIncome);$("#totalExpenses").textContent=money(d.totalExpenses);
  $("#cashIncome").textContent=money(d.totalIncome);$("#cashExpenses").textContent=money(d.totalExpenses);$("#netCashFlow").textContent=money(d.netCashFlow);
  const max=Math.max(Number(d.totalIncome||0),Number(d.totalExpenses||0),1);
  $("#incomeBar").style.width=(d.totalIncome/max*100)+"%";$("#expenseBar").style.width=(d.totalExpenses/max*100)+"%";
  $("#bankList").innerHTML=state.banks.length?state.banks.slice(0,6).map(b=>`<div class="list-row"><div><strong>${esc(b.Account_Name||b["Account Name"]||b.Bank_Name||"Account")}</strong><span>${esc(b.Bank_Name||"Bank")}</span></div><strong>${money(b.Current_Balance)}</strong></div>`).join(""):`<div class="list-row"><span>No bank accounts yet</span></div>`;
  const pending=state.bills.filter(b=>String(b.Status||"PENDING").toUpperCase()!=="PAID").slice(0,6);
  $("#billList").innerHTML=pending.length?pending.map(b=>`<div class="list-row"><div><strong>${esc(b.Bill_Name)}</strong><span>Due ${esc(b.Due_Date||"-")}</span></div><strong>${money(b.Amount)}</strong></div>`).join(""):`<div class="list-row"><span>No pending bills</span></div>`;
  if(chart)chart.destroy();
  const ctx=$("#overviewChart");
  chart=new Chart(ctx,{type:"doughnut",data:{labels:["Cash","PF","PPF","Mutual Funds","Stocks","Other Assets"],datasets:[{data:[d.cashBalance||0,d.pfBalance||0,d.ppfBalance||0,d.mutualFundValue||0,d.stockValue||0,d.otherAssets||0]}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{font:{size:10},boxWidth:10}}}}});
}

function table(target,headers,rows){
  const el=$(target);if(!rows.length){el.innerHTML='<div class="list-row"><span>No records found</span></div>';return}
  el.innerHTML=`<table class="data-table"><thead><tr>${headers.map(h=>`<th>${esc(h[0])}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>"<tr>"+headers.map(h=>`<td>${esc(h[1](r))}</td>`).join("")+"</tr>").join("")}</tbody></table>`;
}
function renderBanks(){table("#banksTable",[["Bank",r=>r.Bank_Name],["Account",r=>r.Account_Name],["Type",r=>r.Account_Type],["Opening",r=>money(r.Opening_Balance)],["Current Balance",r=>money(r.Current_Balance)]],state.banks)}
function renderAssets(){table("#assetsTable",[["Asset",r=>r.Asset_Name],["Type",r=>r.Asset_Type],["Purchase",r=>money(r.Purchase_Value)],["Current Value",r=>money(r.Current_Value)],["Date",r=>r.Purchase_Date]],state.assets)}
function renderInvestments(){
  table("#mfTable",[["Fund",r=>r.name],["Units",r=>Number(r.units||0).toFixed(4)],["Invested",r=>money(r.invested)],["NAV",r=>Number(r.latestNAV||0).toFixed(4)],["Current Value",r=>money(r.currentValue)],["Profit",r=>money(r.profit)]],state.mf);
  table("#stockTable",[["Stock",r=>r.name],["Qty",r=>Number(r.quantity||0).toFixed(4)],["Invested",r=>money(r.invested)],["Current Price",r=>money(r.currentPrice)],["Current Value",r=>money(r.currentValue)],["Profit",r=>money(r.profit)]],state.stocks);
  $("#pfBalance").textContent=money(state.pf?.balance);$("#ppfBalance").textContent=money(state.ppf?.balance);
}
function renderCards(){table("#cardsTable",[["Card",r=>r.Card_Name],["Bank",r=>r.Bank],["Limit",r=>money(r.Credit_Limit)],["Outstanding",r=>money(r.Current_Outstanding)],["Available",r=>money(r.Available_Limit)],["Due",r=>r.Payment_Due_Date]],state.cards)}
function renderLoans(){table("#loansTable",[["Loan",r=>r.Loan_Name],["Lender",r=>r.Lender],["EMI",r=>money(r.EMI_Amount)],["Opening",r=>money(r.Principal)],["Outstanding",r=>money(r.Calculated_Outstanding)],["Due Day",r=>r.EMI_Due_Day]],state.loans)}
function renderBills(){table("#billsTable",[["Bill",r=>r.Bill_Name],["Type",r=>r.Bill_Type],["Provider",r=>r.Provider],["Amount",r=>money(r.Amount)],["Due Date",r=>r.Due_Date],["Status",r=>r.Status]],state.bills)}

async function submitForm(id,action,msgId){
  const f=$("#"+id);try{const data=formData(f);await post({action,...data});showMsg(msgId,"Saved successfully");f.reset();setToday(f);await loadAll()}catch(e){showMsg(msgId,e.message,false)}
}
$("#incomeForm").onsubmit=e=>{e.preventDefault();submitForm("incomeForm","addIncome","incomeMsg")};
$("#expenseForm").onsubmit=e=>{e.preventDefault();submitForm("expenseForm","addExpense","expenseMsg")};
$("#bankForm").onsubmit=e=>{e.preventDefault();submitForm("bankForm","addBankAccount","bankMsg")};
$("#assetForm").onsubmit=e=>{e.preventDefault();submitForm("assetForm","addAsset","assetMsg")};
$("#mfForm").onsubmit=e=>{e.preventDefault();submitForm("mfForm","addMutualFund","mfMsg")};
$("#stockForm").onsubmit=e=>{e.preventDefault();submitForm("stockForm","addStock","stockMsg")};
$("#pfForm").onsubmit=e=>{e.preventDefault();submitForm("pfForm","addPF","pfMsg")};
$("#ppfForm").onsubmit=e=>{e.preventDefault();submitForm("ppfForm","addPPF","ppfMsg")};
$("#cardForm").onsubmit=e=>{e.preventDefault();submitForm("cardForm","addCreditCard","cardMsg")};
$("#ccTxnForm").onsubmit=e=>{e.preventDefault();submitForm("ccTxnForm","addCreditTransaction","ccTxnMsg")};
$("#loanForm").onsubmit=e=>{e.preventDefault();submitForm("loanForm","addLoan","loanMsg")};
$("#emiForm").onsubmit=e=>{e.preventDefault();submitForm("emiForm","addEMI","emiMsg")};
$("#billForm").onsubmit=e=>{e.preventDefault();submitForm("billForm","addBill","billMsg")};

document.querySelectorAll(".form-card").forEach(f=>setToday(f));
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  document.querySelectorAll(".invest-pane").forEach(x=>x.classList.remove("active"));$("#invest-"+b.dataset.invest).classList.add("active");
});
loadAll();
