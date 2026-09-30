export function errorDetails(error:unknown):string {
  const messages:string[]=[];
  let current=error;
  for(let depth=0;depth<5&&current;depth++){
    if(current instanceof Error){messages.push(current.message);current=current.cause;}
    else {messages.push(String(current));break;}
  }
  return messages.join(' · ');
}
export function isDayConflict(error:unknown){return /UNIQUE constraint failed:\s*days\.(date|active)\b/i.test(errorDetails(error));}
export function isStorageFailure(error:unknown){return /D1_|SQLITE_|no such table|database|binding|network|fetch failed/i.test(errorDetails(error));}
