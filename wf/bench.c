#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <time.h>
#include <math.h>
#define NP 5000
#define NC 170
#define NU 2000
static double now(){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e3+t.tv_nsec/1e6;}
static uint64_t rs=0x9E3779B97F4A7C15ull;
static inline uint64_t rng(){uint64_t z=(rs+=0x9E3779B97F4A7C15ull);z=(z^(z>>30))*0xBF58476D1CE4E5B9ull;z=(z^(z>>27))*0x94D049BB133111EBull;return z^(z>>31);}
/* SoA province state, fixed-point int64 */
int64_t pop[NP], gdp[NP], unrest[NP], supply[NP], infra[NP], build[NP], garrison[NP], tax[NP], loyalty[NP], dev[NP], food[NP], industry[NP];
int16_t owner[NP];
int64_t c_treas[NC], c_gdp[NC], c_pop[NC], c_stab[NC], c_mp[NC], c_research[NC];
int64_t opinion[NC*NC], trade[NC*NC];
/* units */
int32_t u_loc[NU], u_dst[NU], u_prog[NU], u_str[NU], u_org[NU], u_owner[NU];
/* graph */
int nN, nE; int *adjStart,*adjList; float *cx,*cy;
static void province_daily(){
  for(int i=0;i<NP;i++){
    int64_t p=pop[i];
    int64_t g=gdp[i]+ (gdp[i]*(industry[i]+dev[i]))/3650000; /* daily growth */
    gdp[i]=g;
    int64_t u=unrest[i] + ((tax[i]-loyalty[i])>>8) - (garrison[i]>>10);
    if(u<0)u=0; if(u>10000)u=10000; unrest[i]=u;
    supply[i]=(supply[i]*15 + infra[i]*1)/16;
    if(build[i]>0) build[i]-= (infra[i]>>4)+1;
    food[i]+= (p>>12) - (p>>13);
    if((rng()&1023)==0) unrest[i]+=50; /* random incident */
  }
}
static void country_aggregate(){
  memset(c_gdp,0,sizeof c_gdp); memset(c_pop,0,sizeof c_pop);
  for(int i=0;i<NP;i++){c_gdp[owner[i]]+=gdp[i]; c_pop[owner[i]]+=pop[i];}
  for(int c=0;c<NC;c++){c_treas[c]+= c_gdp[c]/3650; c_mp[c]=c_pop[c]/100;}
}
static void units_daily(){
  for(int u=0;u<NU;u++){
    if(u_dst[u]!=u_loc[u]){u_prog[u]+=37; if(u_prog[u]>=1000){u_prog[u]=0; u_loc[u]=u_dst[u];}}
    u_org[u]+= (u_org[u]<1000)?5:0;
  }
  /* combat: 100 engagements */
  for(int k=0;k<100;k++){int a=rng()%NU,b=rng()%NU; int64_t da=(u_str[b]*(int64_t)(rng()%100))/1000, db=(u_str[a]*(int64_t)(rng()%100))/1000; u_str[a]-=da; u_str[b]-=db; if(u_str[a]<1)u_str[a]=1000; if(u_str[b]<1)u_str[b]=1000;}
}
static void monthly(){
  /* province demographics with 10 cohorts */
  static int64_t cohort[NP][10];
  for(int i=0;i<NP;i++){int64_t births=pop[i]/600; for(int k=9;k>0;k--){int64_t m=cohort[i][k-1]/120; cohort[i][k-1]-=m; cohort[i][k]+=m - cohort[i][k]/(1000-k*50);} cohort[i][0]+=births; int64_t s=0; for(int k=0;k<10;k++)s+=cohort[i][k]; pop[i]=s>0?s:pop[i];}
  /* trade + opinion matrices */
  for(int a=0;a<NC;a++)for(int b=0;b<NC;b++){int64_t t=(c_gdp[a]/1000)*(c_gdp[b]/1000)/((a==b)?1:(1+((a*31+b*17)%97))); trade[a*NC+b]=t/1000000; opinion[a*NC+b]= opinion[a*NC+b]*95/100;}
  for(int c=0;c<NC;c++){int64_t exp=0; for(int b=0;b<NC;b++)exp+=trade[c*NC+b]; c_treas[c]+=exp/100; c_research[c]+=c_gdp[c]/100000; c_stab[c]=(c_stab[c]*9+5000)/10;}
}
/* Dijkstra with binary heap on real graph */
typedef struct{float d;int n;}HE; static HE heap[200000]; static int hn;
static void hpush(float d,int n){int i=hn++;heap[i].d=d;heap[i].n=n;while(i>0){int p=(i-1)/2;if(heap[p].d<=heap[i].d)break;HE t=heap[p];heap[p]=heap[i];heap[i]=t;i=p;}}
static HE hpop(){HE r=heap[0];heap[0]=heap[--hn];int i=0;for(;;){int l=2*i+1,rr=l+1,m=i;if(l<hn&&heap[l].d<heap[m].d)m=l;if(rr<hn&&heap[rr].d<heap[m].d)m=rr;if(m==i)break;HE t=heap[m];heap[m]=heap[i];heap[i]=t;i=m;}return r;}
static float dist[10000]; static int seen[10000]; static int stamp=0;
static int astar(int s,int t){stamp++;hn=0; for(int i=0;i<nN;i++)dist[i]=1e30f; dist[s]=0; hpush(0,s); int exp=0;
  while(hn){HE e=hpop(); int n=e.n; if(seen[n]==stamp)continue; seen[n]=stamp; exp++; if(n==t)break;
    for(int k=adjStart[n];k<adjStart[n+1];k++){int m=adjList[k]; float dx=cx[n]-cx[m],dy=cy[n]-cy[m]; float w=sqrtf(dx*dx+dy*dy)+0.01f; float nd=dist[n]+w; if(nd<dist[m]){dist[m]=nd; float hx=cx[m]-cx[t],hy=cy[m]-cy[t]; hpush(nd+sqrtf(hx*hx+hy*hy),m);}}}
  return exp;}
int main(int argc,char**argv){
  for(int i=0;i<NP;i++){pop[i]=100000+rng()%5000000; gdp[i]=pop[i]*3; owner[i]=rng()%NC; tax[i]=rng()%5000; loyalty[i]=rng()%5000; infra[i]=rng()%1000; build[i]=rng()%100000; industry[i]=rng()%100; dev[i]=rng()%100; garrison[i]=rng()%10000;}
  for(int u=0;u<NU;u++){u_loc[u]=rng()%NP; u_dst[u]=(rng()&1)?u_loc[u]:rng()%NP; u_str[u]=1000; u_org[u]=500;}
  FILE*f=fopen(argv[1],"r"); fscanf(f,"%d %d",&nN,&nE); cx=malloc(4*nN);cy=malloc(4*nN); for(int i=0;i<nN;i++)fscanf(f,"%f %f",&cx[i],&cy[i]);
  int *ea=malloc(4*nE),*eb=malloc(4*nE); adjStart=calloc(nN+1,4); for(int i=0;i<nE;i++){fscanf(f,"%d %d",&ea[i],&eb[i]); adjStart[ea[i]+1]++; adjStart[eb[i]+1]++;}
  for(int i=0;i<nN;i++)adjStart[i+1]+=adjStart[i]; adjList=malloc(4*2*nE); int*fill=calloc(nN,4); for(int i=0;i<nE;i++){adjList[adjStart[ea[i]]+fill[ea[i]]++]=eb[i]; adjList[adjStart[eb[i]]+fill[eb[i]]++]=ea[i];}
  int DAYS=3650; double t0=now();
  for(int d=0;d<DAYS;d++){province_daily(); units_daily(); country_aggregate(); if(d%30==0) monthly();}
  double t1=now();
  printf("10 years (3650 days, 122 monthly ticks): total %.1f ms => %.3f ms/day average\n",t1-t0,(t1-t0)/DAYS);
  t0=now(); for(int k=0;k<1000;k++) province_daily(); t1=now(); printf("province_daily: %.4f ms\n",(t1-t0)/1000);
  t0=now(); for(int k=0;k<1000;k++) units_daily(); t1=now(); printf("units_daily: %.4f ms\n",(t1-t0)/1000);
  t0=now(); for(int k=0;k<1000;k++) country_aggregate(); t1=now(); printf("country_aggregate: %.4f ms\n",(t1-t0)/1000);
  t0=now(); for(int k=0;k<200;k++) monthly(); t1=now(); printf("monthly: %.4f ms\n",(t1-t0)/200);
  long ex=0; t0=now(); int Q=2000; for(int k=0;k<Q;k++){int s=rng()%nN,t=rng()%nN; ex+=astar(s,t);} t1=now(); printf("A* random pair on real 4596-node graph: %.4f ms/query, avg expanded %.0f nodes\n",(t1-t0)/Q,(double)ex/Q);
  long chk=0; for(int i=0;i<NP;i++)chk+=gdp[i]+unrest[i]; printf("chk %ld\n",chk);
}
