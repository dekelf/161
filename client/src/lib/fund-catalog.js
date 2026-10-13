// Israeli pension funds, insurance companies, and provident funds
// with their withholding file numbers (מספר תיק ניכויים)
// fund_type matches FormDetail FUND_TYPES: pension | insurance | gmul | central_severance

export const FUND_CATALOG = [
  // ────────────────────────────────────────────
  // ביטוחי מנהלים
  // ────────────────────────────────────────────
  { name: 'מנורה מבטחים ביטוח בע"מ',                             withholding_file: '935507640', fund_type: 'insurance', category: 'ביטוח מנהלים' },
  { name: 'איילון חברה לביטוח בע"מ',                             withholding_file: '935359646', fund_type: 'insurance', category: 'ביטוח מנהלים' },
  { name: 'ביטוח ישיר I.D.I חברה לביטוח בע"מ',                  withholding_file: '935859397', fund_type: 'insurance', category: 'ביטוח מנהלים' },
  { name: 'פסגות חברה לביטוח (פ.ב) בע"מ',                       withholding_file: '936069616', fund_type: 'insurance', category: 'ביטוח מנהלים' },
  { name: 'הפניקס חברה לביטוח בע"מ',                            withholding_file: '930638713', fund_type: 'insurance', category: 'ביטוח מנהלים' },
  { name: 'הראל חברה לביטוח בע"מ',                              withholding_file: '930006101', fund_type: 'insurance', category: 'ביטוח מנהלים' },
  { name: 'כלל חברה לביטוח בע"מ',                               withholding_file: '930035985', fund_type: 'insurance', category: 'ביטוח מנהלים' },
  { name: 'מגדל חברה לביטוח בע"מ',                              withholding_file: '930000948', fund_type: 'insurance', category: 'ביטוח מנהלים' },
  { name: 'הכשרה חברה לביטוח בע"מ',                             withholding_file: '935365692', fund_type: 'insurance', category: 'ביטוח מנהלים' },

  // ────────────────────────────────────────────
  // קרנות פנסיה ותיקות
  // ────────────────────────────────────────────
  { name: 'גילעד גמלאות לעובדים דתיים בע"מ (גילעד הותיקה)',     withholding_file: '930176383', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'יוזמה – קרן פנסיה לעצמאים בע"מ',                    withholding_file: '935896647', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'מבטחים – מוסד לביטוח סוציאלי של העובדים בע"מ (מבטחים הותיקה)', withholding_file: '930003918', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'מגן – קרן פנסיה מרכזית לקואופרציה ולמשק הקיבוצי',    withholding_file: '936071042', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'נתיב – קרן הפנסיה של פועלי ועובדי מפעלי משק ההסתדרות בע"מ', withholding_file: '910065119', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'עמית – הפניקס פנסיה (ותיקה)',                         withholding_file: '935730499', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'עתידית קופת פנסיה בע"מ',                              withholding_file: '935330894', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'פסגות – קופת הפנסיה של הסתדרות העובדים הלאומית בע"מ (הע"ל)', withholding_file: '936005511', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'קג"מ – קרן הגמלאות המרכזית של עובדי ההסתדרות בע"מ',  withholding_file: '930003926', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'קופה לתגמולים ופנסיה של עובדי הסוכנות היהודית לא"י בע"מ', withholding_file: '941072274', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'קופת הפנסיה לעובדי הדסה בע"מ',                       withholding_file: '941022196', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'קרן ביטוח ופנסיה לפועלים חקלאים ובלתי מקצועיים בישראל', withholding_file: '930000799', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'קרן גמלאות של חברי דן בע"מ',                         withholding_file: '930006697', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'קרן גמלאות של עורכי דין בישראל בע"מ',                withholding_file: '930617980', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'קרן הביטוח והפנסיה של פועלי בניין ועבודות ציבוריות א.ש. בע"מ', withholding_file: '930001664', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'קרן הגמלאות של חברי אגד בע"מ',                       withholding_file: '930109764', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'קרן הפנסיה עתודות (עתודות הותיקה)',                   withholding_file: '935947184', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },
  { name: 'קרן מקפת מרכז לפנסיה ותגמולים אגודה שיתופית בע"מ (מקפת הותיקה)', withholding_file: '930239769', fund_type: 'pension', category: 'קרן פנסיה ותיקה' },

  // ────────────────────────────────────────────
  // קרנות פנסיה חדשות
  // ────────────────────────────────────────────
  { name: 'פסגות פנסיה מקיפה',                                   withholding_file: '936005511', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'פסגות פנסיה כללית',                                   withholding_file: '936005511', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'מיטב דש פנסיה (מקיפה)',                               withholding_file: '939468484', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'מיטב דש פנסיה כללית',                                 withholding_file: '939468484', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'איילון מיטב דש פנסיה (מקיפה)',                        withholding_file: '939468484', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'איילון מיטב דש פנסיה כללית',                          withholding_file: '939468484', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'מגדל מקפת אישית (מקיפה)',                             withholding_file: '935967851', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'מגדל מקפת משלימה',                                    withholding_file: '935967851', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'איילון פיסגה מקיפה',                                  withholding_file: '935947176', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'איילון פיסגה כללית',                                  withholding_file: '936045020', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'אלטשולר שחם פנסיה מקיפה',                             withholding_file: '935881615', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'אלטשולר שחם פנסיה כללית',                             withholding_file: '935881615', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'הלמן אלדובי קרן פנסיה מקיפה',                        withholding_file: '935953836', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'הלמן אלדובי קרן פנסיה כללית',                        withholding_file: '935953844', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'הפניקס פנסיה מקיפה',                                  withholding_file: '935217323', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'הפניקס פנסיה משלימה',                                 withholding_file: '935973446', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'הראל פנסיה מקיפה',                                    withholding_file: '936300367', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'הראל פנסיה כללית',                                    withholding_file: '936300367', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'כלל פנסיה מקיפה',                                     withholding_file: '935947655', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'כלל פנסיה משלימה',                                    withholding_file: '935947200', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'מבטחים פנסיה מקיפה',                                  withholding_file: '936300342', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'מבטחים פנסיה משלימה',                                 withholding_file: '936300342', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'מנורה מבטחים פנסיה מקיפה',                            withholding_file: '935507640', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'מנורה מבטחים פנסיה כללית',                            withholding_file: '935507640', fund_type: 'pension', category: 'קרן פנסיה חדשה' },
  { name: 'מנורה מבטחים פנסיה משלימה',                           withholding_file: '935507640', fund_type: 'pension', category: 'קרן פנסיה חדשה' },

  // ────────────────────────────────────────────
  // קופות גמל
  // ────────────────────────────────────────────
  { name: 'מגדל גמל ופנסיה',                                     withholding_file: '930000948', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מגדל גמל מסלול כללי',                                  withholding_file: '930000948', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מגדל גמל מסלול הלכה',                                  withholding_file: '930000948', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מגדל גמל מסלול מניות',                                  withholding_file: '930000948', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'הראל גמל ופנסיה',                                      withholding_file: '930006101', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'הראל גמל מסלול כללי',                                   withholding_file: '930006101', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'הראל גמל מסלול הלכה',                                   withholding_file: '930006101', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'כלל גמל ופנסיה',                                        withholding_file: '930035985', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'כלל גמל מסלול כללי',                                    withholding_file: '930035985', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'כלל גמל מסלול הלכה',                                    withholding_file: '930035985', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'כלל גמל מסלול מניות',                                   withholding_file: '930035985', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'הפניקס גמל ופנסיה',                                     withholding_file: '930638713', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'הפניקס גמל מסלול כללי',                                  withholding_file: '930638713', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'הפניקס גמל מסלול הלכה',                                  withholding_file: '930638713', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מנורה מבטחים גמל',                                      withholding_file: '935507640', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מנורה מבטחים גמל מסלול כללי',                           withholding_file: '935507640', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מנורה מבטחים גמל מסלול הלכה',                           withholding_file: '935507640', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מנורה מבטחים גמל מסלול מניות',                          withholding_file: '935507640', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מיטב דש גמל מסלול כללי',                                withholding_file: '939468484', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מיטב דש גמל מסלול הלכה',                                withholding_file: '939468484', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מיטב דש גמל מסלול מניות',                               withholding_file: '939468484', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'אלטשולר שחם גמל',                                       withholding_file: '935881615', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'אלטשולר שחם גמל מסלול כללי',                            withholding_file: '935881615', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'אלטשולר שחם גמל מסלול מניות',                           withholding_file: '935881615', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'הלמן אלדובי גמל',                                       withholding_file: '935953836', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'פסגות גמל',                                             withholding_file: '936005511', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'פסגות גמל מסלול כללי',                                   withholding_file: '936005511', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'הכשרה גמל',                                             withholding_file: '935365692', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'איילון גמל',                                            withholding_file: '935359646', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מיטב גמל ופנסיה מסלול כללי',                            withholding_file: '939468484', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מיטב גמל ופנסיה מסלול הלכה',                            withholding_file: '939468484', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מיטב גמל ופנסיה מסלול מניות',                           withholding_file: '939468484', fund_type: 'gmul', category: 'קופת גמל' },
  { name: 'מיטב גמל ופנסיה מסלול אג"ח',                            withholding_file: '939468484', fund_type: 'gmul', category: 'קופת גמל' },

  // קופות מרכזיות לפיצויים
  { name: 'מגדל קופה מרכזית לפיצויים',                             withholding_file: '930000948', fund_type: 'central_severance', category: 'קופה מרכזית לפיצויים' },
  { name: 'הראל קופה מרכזית לפיצויים',                             withholding_file: '930006101', fund_type: 'central_severance', category: 'קופה מרכזית לפיצויים' },
  { name: 'כלל קופה מרכזית לפיצויים',                              withholding_file: '930035985', fund_type: 'central_severance', category: 'קופה מרכזית לפיצויים' },
  { name: 'הפניקס קופה מרכזית לפיצויים',                           withholding_file: '930638713', fund_type: 'central_severance', category: 'קופה מרכזית לפיצויים' },
  { name: 'מנורה מבטחים קופה מרכזית לפיצויים',                     withholding_file: '935507640', fund_type: 'central_severance', category: 'קופה מרכזית לפיצויים' },
];
