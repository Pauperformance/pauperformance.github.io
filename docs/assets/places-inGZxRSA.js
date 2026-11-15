function s(t){if(!t)return null;if(!/^\d+$/.test(t))return t;const n=parseInt(t),r=n%100>=11&&n%100<=13?"th":{1:"st",2:"nd",3:"rd"}[n%10]||"th";return n+r}export{s as d};
