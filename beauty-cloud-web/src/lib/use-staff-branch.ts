"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchBootstrap, getBranches } from "@/lib/api/browser-client";

export type StaffBranchRow = {
  name: string;
  branch_name?: string;
  branch_code?: string;
};

function canSwitchStores(branchScope: string[] | null | undefined): boolean {
  if (branchScope === null || branchScope === undefined) {
    return true;
  }
  return branchScope.length > 1;
}

export function useStaffBranch() {
  const [branch, setBranch] = useState("");
  const [branches, setBranches] = useState<StaffBranchRow[]>([]);
  const [branchLocked, setBranchLocked] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([getBranches({ staff: true }), fetchBootstrap()])
      .then(([rows, bootstrap]) => {
        setBranches(rows);
        const scope = bootstrap.staff_workflow?.branch_scope;
        setBranchLocked(!canSwitchStores(scope));

        const scoped = bootstrap.staff_workflow?.default_branch;
        if (scoped && rows.some((row) => row.name === scoped)) {
          setBranch(scoped);
        } else if (rows[0]?.name) {
          setBranch(rows[0].name);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const branchLabel = useMemo(
    () => branches.find((row) => row.name === branch)?.branch_name ?? branch,
    [branches, branch],
  );

  return { branch, setBranch, branches, branchLocked, branchLabel, ready };
}
