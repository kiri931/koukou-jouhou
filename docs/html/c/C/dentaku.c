#include<stdio.h>

float tasu(float a, float b);
float hiku(float a, float b);
float kakeru(float a, float b);

int main(void){
    int mode;
    float a, b, n;
    printf("モード選択(1: + , 2: - , 3: * )\n");
    scanf("%d", &mode);
    printf("1つ目の値の入力:\n");
    scanf("%f", &a);
    printf("2つ目の値の入力:\n");
    scanf("%f", &b);

    if(mode == 1){
        printf("足し算を選択しました。\n");
        n = tasu(a, b);
    }else if(mode == 2){    
        printf("引き算を選択しました。\n");
        n = hiku(a, b);
    }else if(mode == 3){
        printf("掛け算を選択しました。\n");
        n = kakeru(a, b);
    }else{
        printf("不正なモードです。\n");
    }

    switch(mode){
        case 1:
            printf("足し算を選択しました。\n");
            n = tasu(a, b);
            break;
        case 2:
            printf("引き算を選択しました。\n");
            n = hiku(a, b);
            break;
        case 3:
            printf("掛け算を選択しました。\n");
            n = kakeru(a, b);
            break;
        default:
            printf("不正なモードです。\n");
    }

    printf("答えは%fです。\n",n);
    return 0;
}


float tasu(float a, float b){
    return a + b;
}

float hiku(float a, float b){
    return a - b;
}

float kakeru(float a, float b){
    return a * b;
}