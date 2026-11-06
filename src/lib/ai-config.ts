import 'server-only';
import { AppError } from './ai-validation';
export function aiProvider(): 'openai'|'gemini' {
 const value=process.env.AI_PROVIDER||'openai';
 if(value!=='openai'&&value!=='gemini')throw new AppError('AI_PROVIDER must be openai or gemini.',503);
 return value;
}
export const providerLabel=()=>aiProvider()==='gemini'?'Google Gemini':'OpenAI';
export const modelName=()=>aiProvider()==='gemini'?(process.env.GEMINI_MODEL||'gemini-3.1-flash-lite'):(process.env.OPENAI_MODEL||'gpt-4.1-mini');
export const isAIConfigured=()=>Boolean(aiProvider()==='gemini'?process.env.GEMINI_API_KEY:process.env.OPENAI_API_KEY);
export function requireAIConfigured(){
 if(!isAIConfigured())throw new AppError(`AI is not configured. Add ${aiProvider()==='gemini'?'GEMINI_API_KEY':'OPENAI_API_KEY'} to the server environment.`,503);
}
