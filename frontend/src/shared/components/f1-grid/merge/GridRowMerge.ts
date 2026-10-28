export type F1GridMergeInfo = {
  isStart: boolean;
  span: number;
};

export function getGridMergeInfo<T extends object>(
  rows: T[],
  field: keyof T,
  parentGroupByRow?: number[],
): F1GridMergeInfo[] {
  return rows.map((row, index) => {
    const previousRow = index > 0 ? rows[index - 1] : undefined;
    const sameValueAsPrevious =
      previousRow !== undefined && Object.is(previousRow[field], row[field]);
    const sameParentGroup =
      parentGroupByRow === undefined ||
      index === 0 ||
      parentGroupByRow[index] === parentGroupByRow[index - 1];

    if (index > 0 && sameValueAsPrevious && sameParentGroup) {
      return { isStart: false, span: 0 };
    }

    let span = 1;
    while (
      index + span < rows.length &&
      Object.is(rows[index + span][field], row[field]) &&
      (!parentGroupByRow ||
        parentGroupByRow[index + span] === parentGroupByRow[index])
    ) {
      span += 1;
    }

    return { isStart: true, span };
  });
}
