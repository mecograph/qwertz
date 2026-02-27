export const en = {
  // Navigation
  nav_dashboard: 'Dashboard',
  nav_charts: 'Charts',
  nav_data: 'Data',
  nav_settings: 'Settings',

  // AppShell
  app_title: 'TX_ANALYZER',
  app_version: 'v0.1.0 | local-only',
  app_session: 'session: local',

  // UploadSplash
  splash_tagline: 'Import XLSX/CSV. Your data stays local in your browser.',
  splash_upload: '[ Upload file ]',
  splash_import_json: '[ Import JSON ]',
  splash_continue: '[ Continue saved ]',

  // SourceSelect
  source_sheet: 'Sheet',
  source_header_note: '$ header_row=1 # default for this MVP',

  // MappingWizard
  mapping_date: 'Date',
  mapping_category: 'Category',
  mapping_label: 'Label (Bezeichnung)',
  mapping_amount: 'Amount',
  mapping_purpose: 'Purpose',
  mapping_not_mapped: 'Not mapped',

  // ValidationReview
  validation_valid_rows: 'Valid rows',
  validation_invalid_rows: 'Invalid rows',

  // ProcessingView
  processing_pipeline: '$ pipeline: parse_file | build_table | apply_mapping | normalize_rows | persist',

  // App.vue
  finish_import: '[ Finish import ]',

  // Filter / DatePicker
  filter_date_range: 'Date Range',
  filter_presets: 'Presets',
  filter_years: 'Years',
  filter_months: 'Months',
  filter_year: 'Year',
  filter_month: 'Month',
  filter_start: 'Start',
  filter_end: 'End',
  filter_apply: 'Apply',
  filter_cancel: 'Cancel',
  filter_apply_date_range: 'Apply Date Range',
  filter_filters: 'Filters',
  filter_reset_all: 'Reset All Filters',
  filter_all_time: 'All time',
  filter_add: '+ Filter',

  // Date presets
  preset_last_7: 'Last 7 days',
  preset_last_30: 'Last 30 days',
  preset_last_90: 'Last 90 days',
  preset_this_month: 'This month',

  // TermFilterChips
  chip_type: 'Type',
  chip_category: 'Category',
  chip_label: 'Label',
  chip_neutral: 'Include Neutral',
  chip_enable_neutral: 'Enable Include Neutral',
  chip_disable_neutral: 'Disable Include Neutral',

  // Dashboard / KPIs
  dashboard_desc: 'Income categories flow into Budget, then Budget flows to spending categories. Click categories (or links) to drill down.',
  kpi_income: 'Income',
  kpi_expenses: 'Expenses',
  kpi_net: 'Net',
  kpi_transactions: 'Transactions',
  kpi_top_category: 'Top category',
  kpi_drilldown: 'Drilldown',
  dashboard_budget: 'Budget',

  // Charts
  charts_desc: 'Excel parity pack · Subcategory = Bezeichnung · chart-first monthly detail',
  charts_income_expense_by_cat: 'Income vs Expense by Category',
  charts_category_label: 'Category + Bezeichnung',
  charts_mode_expense: 'Expense',
  charts_mode_income: 'Income',
  charts_mode_split: 'Split',
  charts_axis_expense: 'Expense',
  charts_axis_income: 'Income',
  charts_year_overview: 'Year overview: monthly Income & Expense by Category',
  charts_monthly_detail: 'Monthly Detail (Chart-first)',
  charts_open_in_data: '[ Open in Data ]',
  charts_detail_drawer: 'Detail drawer',
  charts_amount_abs: 'AmountAbs',
  charts_avg: 'Avg',
  charts_largest: 'Largest',
  charts_breadcrumb_category: 'Category',
  charts_breadcrumb_label: 'Bezeichnung',

  // Table columns
  col_date: 'Date',
  col_type: 'Type',
  col_category: 'Category',
  col_label: 'Label',
  col_purpose: 'Purpose',
  col_amount: 'Amount',

  // DataGrid
  data_search_placeholder: '> search...',
  data_showing: 'Showing',
  data_of: 'of',
  data_filtered_rows: 'filtered rows',
  data_total: 'total',
  data_duplicate: 'Duplicate',
  data_delete: 'Delete',
  data_undo: 'Undo',
  data_redo: 'Redo',
  data_prev: 'Prev',
  data_next: 'Next',
  data_page: 'Page',

  // Settings
  settings_import_data: 'Import Data',
  settings_import_desc: 'Upload additional files to append to your existing data.',
  settings_upload_xlsx: '[ Upload XLSX/CSV ]',
  settings_import_json: '[ Import JSON ]',
  settings_appearance: 'Appearance',
  settings_appearance_desc: 'Switch between dark (terminal) and light (flat) themes.',
  settings_dark: 'Dark',
  settings_light: 'Light',
  settings_language: 'Language',
  settings_language_desc: 'Choose your preferred display language.',
  settings_data_management: 'Data Management',
  settings_rows_stored: 'Rows stored locally',
  settings_export_json: '[ Export JSON ]',
  settings_daily_import_usage: 'Import quota used today',
  settings_import_history: 'Import History',
  settings_activity_log: 'Activity Log',
  settings_export_log: '[ Export Log ]',
  settings_clear_log: '[ Clear Log ]',
  settings_no_log: 'No activity recorded yet.',
  settings_log_level: 'Level',
  settings_log_event: 'Event',
  settings_log_message: 'Message',
  settings_col_date: 'Date',
  settings_col_filename: 'Filename',
  settings_col_source: 'Source',
  settings_col_status: 'Status',
  settings_col_rows: 'Rows',
  settings_col_actions: 'Actions',
  settings_download_original: '[ Download original ]',
  settings_download_original_ok: 'Original file downloaded.',
  settings_download_original_fail: 'Failed to download original file.',
  settings_no_imports: 'No imports recorded yet.',
  settings_danger_zone: 'Danger Zone',
  settings_danger_desc: 'Permanently delete all transaction data from local storage.',
  settings_purge: '[ Purge all data ]',
  settings_about: 'About',
  settings_version: 'TX_ANALYZER v0.1.0',
  settings_about_desc: 'All data is stored locally in your browser. Nothing is sent to any server.',
  settings_purge_title: 'Purge all data',
  settings_purge_message: 'This will permanently delete all transaction data and import history. This action cannot be undone.',
  settings_purge_confirm: 'Purge',

  // Notifications
  notifications_button: 'Notifications',
  notifications_title: 'Notifications',
  notifications_mark_all_read: 'Mark all read',
  notifications_clear: 'Clear',
  notifications_empty: 'No notifications yet.',

  // Feedback
  feedback_import_blocked_size: 'Import blocked: file is larger than 25 MB.',
  feedback_import_blocked_daily_count: 'Import blocked: daily import count limit reached.',
  feedback_import_blocked_daily_bytes: 'Import blocked: daily upload volume limit reached.',
  feedback_import_complete: 'Import complete',
  feedback_import_complete_desc: 'uploaded and parsed.',
  feedback_import_failed: 'Import failed',
  feedback_import_blocked: 'Import blocked',
  feedback_json_import_complete: 'JSON import complete',
  feedback_json_import_complete_desc: 'merged into current dataset.',
  feedback_json_import_failed: 'JSON import failed',
  feedback_mapping_applied: 'Mapping applied',
  feedback_mapping_applied_desc: 'rows are now active.',
  feedback_mapping_issues: 'validation issues found',
  feedback_mapping_issues_desc: 'rows need attention.',
  feedback_mapping_failed: 'Mapping failed',
  feedback_data_purged: 'Local data purged',
  feedback_data_purged_title: 'Data purged',
  feedback_data_purged_desc: 'All local rows and import history have been deleted.',
  feedback_row_duplicated: 'Row duplicated',
  feedback_row_duplicated_desc: 'A transaction row was duplicated in the grid.',
  feedback_row_deleted: 'Row deleted',
  feedback_row_deleted_desc: 'A transaction row was removed from the grid.',
  feedback_undo_applied: 'Undo applied',
  feedback_redo_applied: 'Redo applied',

  // Auth
  auth_title: 'Sign in',
  auth_desc: 'Use email-link sign in to unlock cloud-backed import history.',
  auth_email_placeholder: 'name@example.com',
  auth_sign_in: '[ Send sign-in link ]',
  auth_signing_in: '[ Signing in... ]',
  auth_signed_in: 'Signed in successfully.',
  auth_failed: 'Authentication failed.',
  auth_mock_notice: 'MVP note: running in local mock auth mode until Firebase SDK is connected.',
  auth_sign_out: 'Sign out',

  // Common
  cancel: 'Cancel',
} as const;

export type TranslationKey = keyof typeof en;
