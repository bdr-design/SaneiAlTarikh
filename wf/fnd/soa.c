#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <time.h>
#define NP 6000
#define NC 200
#define COLS 32
static double now(){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec*1e-9;}
int main(){
  double *col[COLS]; for(int c=0;c<COLS;c++){col[c]=malloc(sizeof(double)*NP); for(int i=0;i<NP;i++) col[c][i]=1.0+i*0.001+c;}
  int32_t *owner=malloc(4*NP); for(int i=0;i<NP;i++) owner[i]=i%NC;
  double ctry[NC][8]={{0}}; double rel[NC*NC]; for(int i=0;i<NC*NC;i++) rel[i]=0;
  int days=3650; double t0=now(); double worst=0;
  for(int d=0; d<days; d++){
    double ts=now();
    /* daily: each province updates all columns (pop growth, unrest, construction...) */
    for(int c=0;c<COLS;c++){ double *a=col[c]; double *b=col[(c+1)%COLS]; for(int i=0;i<NP;i++) a[i]=a[i]*1.00001+b[i]*1e-7; }
    /* aggregate provinces -> countries */
    for(int i=0;i<NP;i++){ int o=owner[i]; ctry[o][0]+=col[0][i]*1e-6; ctry[o][1]+=col[1][i]*1e-6; }
    /* monthly: full NxN relation drift */
    if(d%30==0){ for(int i=0;i<NC*NC;i++) rel[i]=rel[i]*0.99+0.01; }
    double dt=now()-ts; if(dt>worst) worst=dt;
  }
  double tot=now()-t0;
  printf("provinces=%d cols=%d countries=%d days=%d total=%.3fs avg_day=%.1fus worst_day=%.1fus check=%f\n",NP,COLS,NC,days,tot,tot/days*1e6,worst*1e6,ctry[3][0]+rel[5]);
  printf("state bytes provinces=%.2f MB\n", NP*COLS*8/1e6);
}
