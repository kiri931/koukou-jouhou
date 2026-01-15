#include <stdio.h>

int main() {
    int scores[5] = {90, 80, 70, 60, 50};
    for(int i = 0; i < 5; i++) {
        printf("得点は、%d点です。\n",scores[i]);
    }
    return 0;
}