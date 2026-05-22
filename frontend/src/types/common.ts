export type SortDirection = 'asc' | 'desc';

export type SelectOption<T extends string = string> = {
  label: string;
  value: T;
};
