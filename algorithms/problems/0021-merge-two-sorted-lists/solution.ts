export class ListNode {
  constructor(
    public value: number,
    public next: ListNode | null = null,
  ) {}
}

export function fromArray(values: readonly number[]): ListNode | null {
  const dummy = new ListNode(0);
  let tail = dummy;
  for (const value of values) {
    tail.next = new ListNode(value);
    tail = tail.next;
  }
  return dummy.next;
}

export function toArray(head: ListNode | null): number[] {
  const values: number[] = [];
  for (let node = head; node !== null; node = node.next) values.push(node.value);
  return values;
}

export function mergeTwoSortedLists(
  first: ListNode | null,
  second: ListNode | null,
): ListNode | null {
  const dummy = new ListNode(0);
  let tail = dummy;
  let left = first;
  let right = second;

  while (left !== null && right !== null) {
    if (left.value <= right.value) {
      tail.next = left;
      left = left.next;
    } else {
      tail.next = right;
      right = right.next;
    }
    tail = tail.next;
  }
  tail.next = left ?? right;
  return dummy.next;
}
