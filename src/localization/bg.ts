// Bulgarian localization for ServiceText Pro

export const bg = {
  // App name and general
  appName: 'ServiceText Pro',
  welcome: 'Добре дошли',
  loading: 'Зареждане...',
  error: 'Грешка',
  success: 'Успешно',
  cancel: 'Отказ',
  save: 'Запазване',
  delete: 'Изтриване',
  edit: 'Редактиране',
  add: 'Добавяне',
  search: 'Търсене',
  settings: 'Настройки',
  
  // Navigation
  dashboard: 'Табло',
  calls: 'Обаждания',
  contacts: 'Контакти',
  messages: 'Съобщения',
  templates: 'Шаблони',
  analytics: 'Анализи',
  
  // Call management
  missedCalls: 'Пропуснати обаждания',
  recentCalls: 'Последни обаждания',
  callHistory: 'История на обажданията',
  incomingCall: 'Входящо обаждане',
  outgoingCall: 'Изходящо обаждане',
  missedCall: 'Пропуснато обаждане',
  callDuration: 'Продължителност на обаждането',
  phoneNumber: 'Телефонен номер',
  
  // Contact management
  contactName: 'Име на контакта',
  contactCategory: 'Категория контакт',
  contactPriority: 'Приоритет на контакта',
  addContact: 'Добавяне на контакт',
  editContact: 'Редактиране на контакт',
  deleteContact: 'Изтриване на контакт',
  importContacts: 'Импортиране на контакти',
  
  // Contact categories
  existingCustomer: 'Съществуващ клиент',
  newProspect: 'Нов потенциален клиент',
  supplier: 'Доставчик',
  emergency: 'Спешен',
  personal: 'Личен',
  blacklisted: 'Черен списък',
  
  // Contact priorities
  low: 'Нисък',
  medium: 'Среден',
  high: 'Висок',
  vip: 'VIP',
  
  // Service types
  electrical: 'Електрически услуги',
  plumbing: 'ВиК услуги',
  hvac: 'Отопление и климатизация',
  general: 'Общи услуги',
  
  // Business hours
  businessHours: 'Работно време',
  workingHours: 'Работни часове',
  afterHours: 'Извън работно време',
  weekend: 'Уикенд',
  holiday: 'Празник',
  
  // Days of week
  monday: 'Понedelник',
  tuesday: 'Вторник',
  wednesday: 'Сряда',
  thursday: 'Четвъртък',
  friday: 'Петък',
  saturday: 'Събота',
  sunday: 'Неделя',
  
  // App modes
  normalMode: 'Нормален режим',
  jobSiteMode: 'Режим на работното място',
  vacationMode: 'Ваканционен режим',
  emergencyOnlyMode: 'Само спешни случаи',
  
  // Messaging platforms
  whatsapp: 'WhatsApp',
  viber: 'Viber',
  telegram: 'Telegram',
  
  // Response templates
  templates: 'Шаблони',
  messageTemplates: 'Шаблони за съобщения',
  createTemplate: 'Създаване на шаблон',
  editTemplate: 'Редактиране на шаблон',
  templateName: 'Име на шаблона',
  templateContent: 'Съдържание на шаблона',
  
  // Default response messages
  defaultResponse: 'Здравейте! В момента не мога да отговоря на телефона. Ще се свържа с Вас възможно най-скоро.',
  emergencyResponse: 'Благодаря за обаждането! За спешни случаи, моля свържете се с мен на {emergencyNumber}.',
  afterHoursResponse: 'Здравейте! Обаждате се извън работното ми време. Работя от {startTime} до {endTime}. Ще се свържа с Вас утре.',
  vacationResponse: 'В момента съм в отпуска до {returnDate}. За спешни случаи се обърнете към {alternativeContact}.',
  
  // Emergency keywords (Bulgarian)
  emergencyKeywords: {
    urgent: 'спешно',
    emergency: 'авария', 
    fire: 'парене',
    sparks: 'искри',
    justHappened: 'току що',
    immediately: 'веднага',
    urgent2: 'незабавно',
    dangerous: 'опасно',
    notWorking: 'не работи',
  },
  
  // Technical terms
  electricalTerms: {
    panel: 'табло',
    outlet: 'контакт',
    switch: 'прекъсвач',
    wiring: 'окабеляване',
    fuse: 'предпазител',
    circuit: 'верига',
    voltage: 'напрежение',
    power: 'мощност',
  },
  
  // Plumbing terms
  plumbingTerms: {
    pipe: 'тръба',
    leak: 'течение',
    blockage: 'запушване',
    faucet: 'кран',
    toilet: 'тоалетна',
    heating: 'отопление',
    boiler: 'котел',
    radiator: 'радиатор',
  },
  
  // Analytics
  statistics: 'Статистики',
  totalCalls: 'Общо обаждания',
  responseRate: 'Процент отговори',
  conversionRate: 'Процент преобразуване',
  averageJobValue: 'Средна стойност на работата',
  
  // Permissions
  permissionRequired: 'Изисква се разрешение',
  contactsPermission: 'Разрешение за достъп до контакти',
  callLogPermission: 'Разрешение за достъп до история на обажданията',
  phoneStatePermission: 'Разрешение за състояние на телефона',
  
  // Error messages
  errors: {
    permissionDenied: 'Разрешението е отказано',
    contactsLoadFailed: 'Неуспешно зареждане на контактите',
    callLogAccessFailed: 'Неуспешен достъп до историята на обажданията',
    messageSendFailed: 'Неуспешно изпращане на съобщение',
    networkError: 'Грешка в мрежата',
    unknownError: 'Неизвестна грешка',
  },
  
  // Success messages
  success_messages: {
    contactSaved: 'Контактът е запазен успешно',
    templateSaved: 'Шаблонът е запазен успешно',
    messageSent: 'Съобщението е изпратено успешно',
    settingsSaved: 'Настройките са запазени успешно',
  },
  
  // Professional terms for different trades
  trades: {
    electrician: 'електротехник',
    plumber: 'водопроводчик',
    hvacTechnician: 'техник по климатизация',
    generalHandyman: 'майстор',
  },
  
  // Bulgarian business terms
  business: {
    eik: 'ЕИК',
    vat: 'ДДС номер',
    invoice: 'фактура',
    receipt: 'разписка',
    leva: 'лв.',
    workOrder: 'нарядна работа',
  },
};

export type TranslationKey = keyof typeof bg;
export default bg;

