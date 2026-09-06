# Personal Finance Tracker — GitHub Website

This is the frontend for the Google Sheets + Google Apps Script personal finance backend.

## Files
- index.html
- style.css
- app.js

## Backend
The website is already configured with the supplied Apps Script Web App URL.

## GitHub Pages
1. Create a GitHub repository.
2. Upload all three files.
3. Commit to `main`.
4. Open Settings → Pages.
5. Deploy from `main` / root.

## Important
The backend must expose:
`?action=getAllData`

The website reads the dashboard and all sections from that endpoint. It does not store financial data in the browser.

## Sections shown
Dashboard, Income, Expenses, Bank Accounts, Assets, Mutual Funds, Stocks, PF, PPF, Credit Cards, Loans & EMIs, and Bills.

The dashboard calculates/display values returned by the backend, including cash, all bank balances, PF, PPF, investments, liabilities and net worth.
