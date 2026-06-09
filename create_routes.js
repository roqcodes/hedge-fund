const fs = require('fs');
const path = require('path');

const routes = [
  { dir: 'group', content: `import GroupsPage from '@/components/deals/DealsManagement';\nexport default function Page() { return <GroupsPage />; }\n` },
  { dir: 'finance', content: `import FinancePage from '@/components/finance/FinancePage';\nexport default function Page() { return <FinancePage />; }\n` },
  { dir: 'funds', content: `import FundManagement from '@/components/funds/FundManagement';\nexport default function Page() { return <FundManagement />; }\n` },
  { dir: 'investors', content: `import InvestorsPage from '@/components/investors/InvestorsPage';\nexport default function Page() { return <InvestorsPage />; }\n` },
  { dir: 'reports', content: `import ReportsPage from '@/components/reports/ReportsPage';\nexport default function Page() { return <ReportsPage />; }\n` },
];

const basePath = path.join(__dirname, 'src', 'app', '[slug]');

routes.forEach(route => {
  const dirPath = path.join(basePath, route.dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(path.join(dirPath, 'page.tsx'), route.content, 'utf8');
});

console.log('Successfully created path-based routes.');
