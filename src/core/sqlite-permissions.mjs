// Local trusted-directory boundary. Never change process-wide umask.
// Existing databases must be quiescent when migrating from insecure permissions.
import {openSync,closeSync,fstatSync,fchmodSync,lstatSync,constants} from 'node:fs';

function protect(path,{create=false,optional=false}={}){
 // Opening and closing a second descriptor for an already-open SQLite file
 // can release process-associated POSIX locks. Never do so for secure files.
 try{
  const stat=lstatSync(path);
  if(!stat.isFile()||stat.nlink!==1||stat.uid!==process.getuid())throw new Error('SQLite file must be a regular, singly linked owner-controlled file');
  if((stat.mode&0o7777)===0o600)return;
 }catch(error){if(error.code!=='ENOENT')throw error;if(optional)return;if(!create)throw error;}
 let fd;
 const flags=constants.O_RDWR|constants.O_NOFOLLOW|constants.O_NONBLOCK;
 try{
  if(create){
   try{fd=openSync(path,flags|constants.O_CREAT|constants.O_EXCL,0o600);}
   catch(error){if(error.code!=='EEXIST')throw error;}
  }
  if(fd===undefined)fd=openSync(path,flags);
  const stat=fstatSync(fd);
  if(!stat.isFile()||stat.nlink!==1||stat.uid!==process.getuid())throw new Error('SQLite file must be a regular, singly linked owner-controlled file');
  if((stat.mode&0o7777)!==0o600)fchmodSync(fd,0o600);
 }catch(error){if(!optional||error.code!=='ENOENT')throw error;}
 finally{if(fd!==undefined)closeSync(fd);}
}
export function preparePrivateSQLite(path,{create=true}={}){
 // Windows uses inherited ACLs; POSIX mode bits do not enforce Windows privacy.
 if(process.platform==='win32')return;
 protect(path,{create});
 protectSQLiteSidecars(path);
}
export function protectSQLiteSidecars(path){
 if(process.platform==='win32')return;
 for(const suffix of ['-wal','-shm','-journal'])protect(path+suffix,{optional:true});
}
