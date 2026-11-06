export const plans = {Monthly:32,Student:26,'Off-peak':24,Annual:27,Couples:54};
export type MemberStatus='Active'|'At risk'|'Failed payment'|'Frozen';
export interface DemoMember {id:string;name:string;email:string;plan:keyof typeof plans;visits:number;lastVisit:number;months:number;status:MemberStatus;tag?:string}
const first='Aaron Ben Callum Dan Ella Finn Grace Harry Isla Josh Kyle Lucy Megan Nathan Olivia Pete Rhys Sophie Tom Zoe Amy Ryan Holly Connor Jess Liam Beth Adam'.split(' ');
const last='Hall Reid Walker Shaw Bell Dixon Hunter Murray Wood Forster Heron Scott Armstrong Nicholson Graham Wilson Lowther Taylor Ord'.split(' ');
export const makeMembers=():DemoMember[]=>Array.from({length:342},(_,i)=>({id:`member-${i}`,name:`${first[i%first.length]} ${last[(i*7+3)%last.length]}`,email:`sample.member${i+1}@example.invalid`,plan:Object.keys(plans)[i%5] as keyof typeof plans,visits:i%13===0?0:Number((1+(i%35)/10).toFixed(1)),lastVisit:i%13===0?23+i%12:i%7,months:1+i%30,status:i%29===0?'Failed payment':i%19===0?'Frozen':i%13===0?'At risk':'Active'}));
export const stages=['New','Contacted','Trial booked','Trial attended','Joined','Lost'] as const;
export interface DemoLead {id:string;name:string;email:string;phone:string;source:string;stage:typeof stages[number];referrer:string;next:string}
export const makeLeads=():DemoLead[]=>Array.from({length:71},(_,i)=>({id:`lead-${i}`,name:`${first[(i*3+4)%first.length]} ${last[(i*5+2)%last.length]}`,email:`sample.lead${i+1}@example.invalid`,phone:'07700 900'+String(i+100),source:['Friends','Instagram','Google','Walk-in','Friends','Facebook'][i%6],stage:stages[i%6],referrer:i%4===0?['Jamie','Chloe','Brogan'][Math.floor(i/4)%3]:'',next:['Welcome email','Follow-up reminder','Trial-day SMS','Check-in after trial','No follow-up','No follow-up'][i%6]}));
export const trialSteps=[
 ['Day 0','Welcome email and SMS with trial booking link','71 recipients · 94% opened'],
 ['Day 1','Reminder to book the trial if not booked','22 recipients · 11 booked'],
 ['Trial day','Morning reminder with the address and what to bring','49 recipients · 91% opened'],
 ['+1 day','How was it? Check-in and joining offer','38 recipients · 14 joined'],
 ['+3 days','Follow up if no sign-up','24 recipients · 6 joined'],
 ['+7 days','Last nudge, then move to the newsletter audience','18 recipients · 2 joined'],
];
export interface Journey {id:string;name:string;on:boolean;enrolled:number;steps:[string,string][]}
export const makeJourneys=():Journey[]=>[
 {id:'nurture',name:'Lead nurture',on:true,enrolled:18,steps:[['Trigger','New prospect joins online'],['Wait','2 hours'],['Send','Welcome email and how to join'],['Wait','2 days'],['Condition','Has booked a trial?'],['Send','If not: SMS with a first-session invitation'],['End','Signs up as a member']]},
 {id:'lapsed',name:'Lapsed-member re-engagement',on:true,enrolled:26,steps:[['Trigger','No visit for 14 days'],['Condition','Has an active membership?'],['Send','Active member: a friendly check-in'],['Send','Lapsed member: an invitation to return'],['End','Member comes back']]},
 {id:'birthday',name:'Birthday messaging',on:true,enrolled:3,steps:[['Trigger','Member birthday'],['Send','Happy birthday email with a small treat']]},
 {id:'referral',name:'Referral thank-you',on:false,enrolled:0,steps:[['Trigger','A referred person joins'],['Wait','1 day'],['Send','Thank-you email and reward details']]},
];
export const templates=[
 {name:'Welcome',subject:'Welcome to Graft, {first_name}',body:'Hi {first_name},\n\nThanks for getting in touch. Find a time to try the gym here: [booking link]\n\nThe Graft Gym team'},
 {name:'Trial offer',subject:'How was your trial, {first_name}?',body:'Hi {first_name},\n\nThanks for coming in. If you would like to carry on, here are the options for new members: [membership link]\n\nThe Graft Gym team'},
 {name:'We miss you',subject:'We have not seen you, {first_name}',body:'Hi {first_name},\n\nWe have missed you at Graft. Is there anything we can do to help you get back in?\n\nThe Graft Gym team'},
 {name:'Birthday',subject:'Happy birthday, {first_name}',body:'Hi {first_name},\n\nHappy birthday from everyone at Graft. [birthday treat]\n\nThe Graft Gym team'},
 {name:'Bring a friend',subject:'Bring a friend, {first_name}',body:'Hi {first_name},\n\nBring a friend for a session and discover [referral reward].\n\nThe Graft Gym team'},
];
export const classes=[{time:'06:00',name:'HIIT',trainer:'Toby',booked:18,capacity:20,waiting:0},{time:'07:30',name:'Strength and Abs',trainer:'Alex',booked:14,capacity:16,waiting:0},{time:'12:00',name:'Boxercise',trainer:'Toby',booked:9,capacity:15,waiting:0},{time:'17:30',name:'Spin',trainer:'Angela',booked:15,capacity:15,waiting:3},{time:'18:30',name:'HIIT',trainer:'Toby',booked:20,capacity:20,waiting:4},{time:'19:30',name:'Yoga Flow',trainer:'Angela',booked:8,capacity:14,waiting:0}];
export const sampleSends=[['Autumn offer',812,'41%','6.2%',9],['New starter welcome',71,'94%','38%',27],['Missed you check-in',64,'52%','11%',0],['Bring a friend week',342,'58%','12%',6],['Winter opening hours',342,'63%','4%',0]];
