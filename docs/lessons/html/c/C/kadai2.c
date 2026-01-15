#include <stdio.h>

float chohokei(float tate , float yoko);

int main(void){
    float menseki = chohokei(5.9 , 3.7);
    printf("%f\n",menseki);
    return 0;
}



float chohokei(float tate , float yoko){
    float menseki;
    menseki = tate * yoko;
    return menseki;
}

