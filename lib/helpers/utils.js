import cliSpinners from 'cli-spinners';
import chalk from 'chalk';
import logUpdate from 'log-update';
export const promisify = (fn, scope) => {
  return function(...args){
    return new Promise((resolve,reject) => {
      fn.apply(scope, args.concat(function(err, suc){
        if(err){
          reject(err);
        }else{
          resolve(suc);
        }
      }));
    });
  };
};

export const LoadSpinner = (type, color, message) => {
  const { frames, interval } = cliSpinners[type];
  const total = frames.length;
  let i = 0;
  let timer;
  return {
    start(){
      timer = setInterval(() => {
        logUpdate(chalk[color || 'green'](frames[i = ++i % total]) + (message || ''));
      }, interval);
    },
    stop(){
      clearInterval(timer);
    }
  }
};