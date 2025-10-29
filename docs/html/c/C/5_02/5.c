#include<stdio.h>
int main(void){
    int score;
    // 変数scoreに整数を入力
    printf("点数を入力してください：");
    scanf("%d", &score);
    //80点以上なら合格
    if(score >= 80){
        printf("合格です。\n");
    }else{
        printf("不合格です。\n");
    }
    return 0;
}