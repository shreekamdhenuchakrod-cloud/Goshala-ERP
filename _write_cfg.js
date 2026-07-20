const fs=require('fs');  
fs.writeFileSync('firebase.json', JSON.stringify({hosting:{public:'dist',ignore:['firebase.json'],rewrites:[{source:'**',destination:'/index.html'}]}},null,2));  
fs.writeFileSync('.firebaserc', JSON.stringify({projects:{default:'skb-goshala-chakrod'}},null,2));  
console.log('done');  
