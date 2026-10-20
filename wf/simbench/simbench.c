// Rough cost of a daily O(provinces) tick + monthly macro + staggered AI, struct-of-arrays.
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <time.h>
#define NP 4596
#define NC 170
#define NE 10769
static float pop[NP],urb[NP],infra[NP],unrest[NP],unrestT[NP],out[NP],dmg[NP],supply[NP],garr[NP],ctrl[NP];
static int owner[NP]; static int ea[NE],eb[NE];
static double gdp[NC],K[NC],A[NC],L[NC],debt[NC],infl[NC],stab[NC],tax[NC];
static double now(){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec*1e-9;}
int main(){
  srand(1);
  for(int i=0;i<NP;i++){pop[i]=100+rand()%5000;urb[i]=(rand()%100)/100.f;infra[i]=rand()%5;owner[i]=rand()%NC;unrestT[i]=rand()%100;}
  for(int e=0;e<NE;e++){ea[e]=rand()%NP;eb[e]=rand()%NP;}
  for(int c=0;c<NC;c++){K[c]=1e3;A[c]=1;L[c]=100;debt[c]=0.4;infl[c]=0.05;stab[c]=60;tax[c]=0.2;}
  int days=365*15; double t0=now(); volatile float sink=0;
  for(int d=0;d<days;d++){
    // daily: province smoothing, supply diffusion over edges (worst case: every day)
    for(int i=0;i<NP;i++){ unrest[i]+= (unrestT[i]-unrest[i])*(1.f/30.f); ctrl[i]+= (1.f-ctrl[i])*0.01f - (unrest[i]>75?0.002f:0); }
    for(int e=0;e<NE;e++){ float a=supply[ea[e]],b=supply[eb[e]]; float f=(a-b)*0.05f; supply[ea[e]]-=f; supply[eb[e]]+=f; }
    if(d%30==0){ // monthly macro + province output
      for(int c=0;c<NC;c++){ double Y=A[c]*pow(K[c],0.33)*pow(L[c],0.67); K[c]=K[c]*(1-0.05/12)+0.2*Y/12; gdp[c]=Y;
        double g=0.003, r=0.08/12; debt[c]=debt[c]*(1+r)/(1+g)-0.001; infl[c]=0.7*infl[c]+0.3*0.05; stab[c]+= (50-stab[c])*0.05; }
      for(int i=0;i<NP;i++){ out[i]=pop[i]*(0.5f+urb[i])*(1+infra[i]*0.1f)*(1-dmg[i]); sink+=out[i]; }
    }
    // staggered strategic AI: ~NC/30 countries per day, 40 options x 8 considerations each
    for(int c=d%30;c<NC;c+=30){ double best=-1; for(int o=0;o<40;o++){ double u=1; for(int k=0;k<8;k++){ double x=fmod(gdp[c]*0.001+o*0.13+k*0.07,1.0); u*= 1/(1+exp(-8*(x-0.5))); } if(u>best)best=u;} sink+=best; }
  }
  double t1=now();
  printf("simulated %d days in %.3f s => %.1f us/day (sink %f)\n",days,t1-t0,(t1-t0)/days*1e6,sink);
  return 0;
}
