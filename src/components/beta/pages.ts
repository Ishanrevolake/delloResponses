// Navigation mirrors the supplied HTML. These routes are isolated UI previews.
export const betaPages = [
 {id:'overview',label:'Overview',title:'Overview',description:'How the gym is doing this month.'},
 {id:'leads',label:'Leads & trials',title:'Leads & trials',description:'From enquiry to first payment, with follow-up journeys.'},
 {id:'members',label:'Members',title:'Members',description:'Memberships, visits and the people who need a check-in.'},
 {id:'campaigns',label:'Campaigns',title:'Campaigns',description:'Email and SMS, audiences, templates and campaign results.'},
 {id:'funnel',label:'Sales funnel',title:'Sales funnel',description:'Move enquiries through each stage and set follow-up tasks.'},
 {id:'workflows',label:'Workflows',title:'Workflows',description:'Customer journeys: who enters, what is sent and when.'},
 {id:'classes',label:'Classes',title:'Classes & check-ins',description:'Timetables, waiting lists and attendance.'},
 {id:'tasks',label:'Tasks & audit',title:'Tasks & audit',description:'Team follow-ups and a record of preview actions.'},
 {id:'team',label:'Team & rota',title:'Team & rota',description:'Opening, closing, cleaning checks and each trainer’s day.'},
 {id:'growth',label:'Growth tools',title:'Growth tools',description:'Promo codes, loyalty rules and ways to capture enquiries.'},
 {id:'coverage',label:'Complete plan',title:'Complete plan coverage',description:'The feature inventory from the supplied ClubRight comparison.'},
 {id:'connect',label:'Connections',title:'Connections',description:'Preview the data imports and connections for your gym.'},
] as const;
export type BetaSection = typeof betaPages[number]['id'];
export const isBetaSection = (value:string):value is BetaSection => betaPages.some(page=>page.id===value);
