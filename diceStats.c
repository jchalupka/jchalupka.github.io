
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int main(void){
   int i = 0;         // Loop counter iterates numRolls times
   int numRolls = 0;  // User defined number of rolls
   int numSixes = 0;  // Tracks number of 6s found
   int numSevens = 0; // Tracks number of 7s found
   int numTwelves = 0;
   int die1 = 0;      // Dice values
   int die2 = 0;      // Dice values
   int rollTotal = 0; // Sum of dice values
   int rollStats[11] = {0,0,0,0,0,0,0,0,0,0,0};

   printf("Enter number of rolls: \n");
   scanf("%d", &numRolls);
   printf("%d",numRolls);
   srand(time(0));

   if (numRolls >= 1) {
      // Roll dice numRoll times
      for (i = 0; i < numRolls; ++i) {
         die1 = rand() % 6 + 1;
         die2 = rand() % 6 + 1;
         rollTotal = die1 + die2;


         rollStats[rollTotal-2]=rollStats[rollTotal-2]+1;
         // Count number of sixs and sevens
         if (rollTotal == 6) {
            numSixes = numSixes + 1;
         }
         else if (rollTotal == 7) {
            numSevens = numSevens + 1;
         }
         else if (rollTotal == 12) {
            numTwelves = numTwelves + 1;
         }
         printf("\nRoll %d is %d (%d+%d)\n",i+1,rollTotal,die1,die2);
      }

      // Print statistics on dice rolls
      printf("\n\nDice roll statistics: \n");

      for(int i = 0; i <= 10; ++i){
          printf("%d's: %d\n",i+2,rollStats[i]+2);
      }
   }
   else {
      printf("Invalid rolls. Try again.\n");
   }

   return 0;
}
