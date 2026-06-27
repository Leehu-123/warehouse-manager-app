const fs = require('fs');
const path = require('path');

const srcDir = 'f:/Antigrapvity/Stock manager/client/src/pages';
const filesToUpdate = [
  { path: 'damages/DamageReportList.tsx', endpoint: 'damage-reports', name: 'DamageReport' },
  { path: 'stocktakes/StocktakeList.tsx', endpoint: 'stocktakes', name: 'Stocktake' },
  { path: 'adjustments/AdjustmentList.tsx', endpoint: 'adjustments', name: 'StockAdjustment' }
];

filesToUpdate.forEach(u => {
  const filePath = path.join(srcDir, u.path);
  let content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('hardDeleteItem')) {
    console.log('Skipping ' + u.path + ' (already has hard delete)');
    return;
  }

  // 1. Add useAuth if not present
  if (!content.includes('useAuth')) {
    content = content.replace("import { api } from '../../api/client';", "import { api } from '../../api/client';\nimport { useAuth } from '../../contexts/AuthContext';");
  }

  // 2. Add hardDeleteItem state
  content = content.replace(
    /const \[deleteItem, setDeleteItem\] = useState<[^>]+>\(null\);/,
    `$&
  const [hardDeleteItem, setHardDeleteItem] = useState<${u.name} | null>(null);`
  );

  // 3. Add isAdmin check
  if (!content.includes('const isAdmin =')) {
    content = content.replace(
      /const loadData = useCallback/,
      `const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const loadData = useCallback`
    );
  }

  // 4. Add handleHardDelete function
  content = content.replace(
    /const filterOptions/,
    `const handleHardDelete = async () => {
    if (!hardDeleteItem) return;
    try {
      await api.delete(\`/${u.endpoint}/\${hardDeleteItem.id}/hard\`);
      toast.success('Đã xóa vĩnh viễn');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Có lỗi xảy ra');
    } finally {
      setHardDeleteItem(null);
    }
  };

  const filterOptions`
  );

  // 5. Add UI Button
  const uiButton = `
        {isAdmin && ['nhap', 'cho_duyet', 'huy'].includes(r.status) && (
          <button onClick={() => setHardDeleteItem(r)} className="btn-icon hover:bg-red-50" title="Xóa vĩnh viễn">
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        )}
      </div>`;
  content = content.replace(/<\/div>\s*\}\),/, uiButton + '\n    }),');

  // 6. Add ConfirmDialog
  const confirmDialog = `
      <ConfirmDialog
        isOpen={!!hardDeleteItem}
        onClose={() => setHardDeleteItem(null)}
        onConfirm={handleHardDelete}
        title="Xóa vĩnh viễn"
        message={\`Bạn có chắc chắn muốn xóa vĩnh viễn \${hardDeleteItem?.code}? Hành động này không thể hoàn tác.\`}
        variant="danger"
        confirmText="Xóa vĩnh viễn"
      />
    </div>`;
  content = content.replace(/<\/div>\s*;\s*}\s*$/, confirmDialog + '\n  );\n}\n');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Updated ' + u.path);
});
