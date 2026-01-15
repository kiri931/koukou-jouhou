#include<stdio.h>
int main(void){
    int num;
    // 奇数・偶数判定
    scanf("%d",&num);

    if(num % 2 == 0/*変数 % 2 == 0*/){
    // 偶数なら偶数と出力
        printf("偶数です\n");
    }else{
    // 奇数なら奇数と出力
        printf("奇数です\n");
    }

    return 0;
}