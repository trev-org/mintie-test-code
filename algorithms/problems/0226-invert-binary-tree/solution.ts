export class TreeNode {
  constructor(
    public value: number,
    public left: TreeNode | null = null,
    public right: TreeNode | null = null,
  ) {}
}

export function invertTree(root: TreeNode | null): TreeNode | null {
  if (root === null) return null;
  const originalLeft = root.left;
  root.left = invertTree(root.right);
  root.right = invertTree(originalLeft);
  return root;
}
