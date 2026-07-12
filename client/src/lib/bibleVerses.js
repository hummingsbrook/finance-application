const VERSES = [
  { reference: 'Proverbs 3:9', text: 'Honor the Lord with your wealth, with the firstfruits of all your produce.' },
  { reference: 'Malachi 3:10', text: 'Bring the whole tithe into the storehouse, that there may be food in my house. Test me in this, says the Lord Almighty, and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it.' },
  { reference: '2 Corinthians 9:7', text: 'Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.' },
  { reference: 'Luke 6:38', text: 'Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap. For with the measure you use, it will be measured to you.' },
  { reference: 'Matthew 6:21', text: 'For where your treasure is, there your heart will be also.' },
  { reference: 'Philippians 4:19', text: 'And my God will meet all your needs according to the riches of his glory in Christ Jesus.' },
  { reference: 'Proverbs 11:25', text: 'A generous person will prosper; whoever refreshes others will be refreshed.' },
  { reference: '2 Corinthians 8:12', text: 'For if the willingness is there, the gift is acceptable according to what one has, not according to what one does not have.' },
  { reference: 'Hebrews 13:16', text: 'And do not forget to do good and to share with others, for with such sacrifices God is pleased.' },
  { reference: 'Deuteronomy 16:17', text: 'Each of you must bring a gift in proportion to the way the Lord your God has blessed you.' },
  { reference: 'Psalm 24:1', text: 'The earth is the Lord\'s, and everything in it, the world, and all who live in it.' },
  { reference: '1 Timothy 6:17-18', text: 'Command those who are rich in this present world not to be arrogant nor to put their hope in wealth, which is so uncertain, but to put their hope in God, who richly provides us with everything for our enjoyment. Command them to do good, to be rich in good deeds, and to be generous and willing to share.' },
  { reference: 'Acts 20:35', text: 'In everything I did, I showed you that by this kind of hard work we must help the weak, remembering the words the Lord Jesus himself said: "It is more blessed to give than to receive."' },
  { reference: 'Proverbs 22:9', text: 'The generous will themselves be blessed, for they share their food with the poor.' },
  { reference: 'Matthew 25:40', text: 'The King will reply, "Truly I tell you, whatever you did for one of the least of these brothers and sisters of mine, you did for me."' },
  { reference: 'Psalm 37:25', text: 'I was young and now I am old, yet I have never seen the righteous forsaken or their children begging bread.' },
  { reference: 'James 1:17', text: 'Every good and perfect gift is from above, coming down from the Father of the heavenly lights, who does not change like shifting shadows.' },
  { reference: 'Proverbs 19:17', text: 'Whoever is kind to the poor lends to the Lord, and he will reward them for what they have done.' },
  { reference: '2 Corinthians 9:6', text: 'Remember this: Whoever sows sparingly will also reap sparingly, and whoever sows generously will also reap generously.' },
  { reference: 'Psalm 112:5', text: 'Good will come to those who are generous and lend freely, who conduct their affairs with justice.' },
  { reference: 'Matthew 6:3-4', text: 'But when you give to the needy, do not let your left hand know what your right hand is doing, so that your giving may be in secret. Then your Father, who sees what is done in secret, will reward you.' },
  { reference: 'Leviticus 27:30', text: 'A tithe of everything from the land, whether grain from the soil or fruit from the trees, belongs to the Lord; it is holy to the Lord.' },
  { reference: 'Proverbs 28:27', text: 'Those who give to the poor will lack nothing, but those who close their eyes to them receive many curses.' },
  { reference: 'Isaiah 32:8', text: 'But the noble make noble plans, and by noble deeds they stand.' },
  { reference: 'Nehemiah 2:20', text: 'The God of heaven will give us success. We his servants will start rebuilding, but as for you, you have no share in Jerusalem or any claim or historic right to it.' },
  { reference: 'Haggai 2:8', text: 'The silver is mine and the gold is mine, declares the Lord Almighty.' },
  { reference: 'Psalm 50:10', text: 'For every animal of the forest is mine, and the cattle on a thousand hills.' },
  { reference: 'Joshua 1:9', text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.' },
  { reference: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.' },
  { reference: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.' },
];

/**
 * Returns a deterministic verse for today based on the day of the year.
 * The same verse displays all day for all users and rotates daily.
 */
export function getVerseOfTheDay() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return VERSES[dayOfYear % VERSES.length];
}