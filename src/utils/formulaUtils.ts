
export const evaluateFormulaForRow = (
  columns: string[],
  row: Record<string, string>,
  formula: string,
  isSource: boolean
): number | string => {
  if (columns.length === 0) return 0;

  if (columns.length === 1) {
    const value = row[columns[0]];
    return isNaN(Number(value)) ? value : Number(value);
  }

  let result: number = 0;

  if (formula.includes('=')) {
    const formulaParts = formula.split('=');
    const relevantFormula = isSource ? formulaParts[0].trim() : formulaParts[1].trim();

    try {
      let expression = relevantFormula;
      for (const column of columns) {
        const regex = new RegExp(column, 'g');
        const value = row[column];
        const numericValue = isNaN(Number(value)) ? 0 : Number(value);
        expression = expression.replace(regex, numericValue.toString());
      }

      result = eval(expression);
      return isNaN(result) ? 0 : result;
    } catch (error) {
      console.error('Error evaluating formula:', error);
      return 0;
    }
  }

  return columns.reduce((sum, col) => {
    const val = row[col];
    return sum + (isNaN(Number(val)) ? 0 : Number(val));
  }, 0);
};
