import json,random, time, io, datetime

falseData = {'request':{'path':'/rci/show/mws/log','method':'POST'},'response':{}}
memberData = {'request':{'path':'/rci/show/mws/member','method':'POST'},'response':{'member':[], 'prompt': '(config)'}}
logData = {'log':{}}
macs = ['ec:d0:9f:11:30:a9',
        'af:90:aa:1b:e5:f7',
        'df:09:9c:a4:78:32',
        '11:11:11:11:11:11',
        'aa:dd:cc:ee:44:55',
        '12:34:56:78:90:ab',
        '44:55:11:22:33:66',
        '34:12:1a:88:16:09',
        'aa:bb:cc:dd:ee:ff',
        '77:77:77:77:77:77']
routers = ['50:ff:20:00:01:01','50:ff:20:00:00:14','50:ff:20:12:34:56','50:ff:20:aa:aa:aa']
note={}
dates=[]

def strTimeProp(start, end, format, prop):
    stime = time.mktime(time.strptime(start, format))
    etime = time.mktime(time.strptime(end, format))

    ptime = stime + prop * (etime - stime)

    return time.strftime(format, time.localtime(ptime))


def randomDate(start, end, prop):
    return strTimeProp(start, end, '%b %d %H:%M:%S', prop)

n = int(input())
for i in range(n):
    dates.append(randomDate("Jan 1 00:00:00", "Dec 31 23:59:59", random.random()))

dates = sorted(dates, key=lambda x: datetime.datetime.strptime(x, '%b %d %H:%M:%S'))

for i in range(n):
    note['timestamp'] = dates[i]
    note['mac'] = macs[random.randrange(10)]
    note['id'] = i
    note['segment'] = random.randrange(2)
    note['band'] = random.randrange(2)
    event = random.randrange(5)
    if event in (0,2,3,4):
        note['ap']=routers[random.randrange(4)]
    if event in (1,2,3,4):
        note['left'] = {'ap':routers[random.randrange(4)],'band':random.randrange(2)}
    if event == 3:
        note['roam'] = 'ft'
    elif event == 4:
        note['roam'] = 'pmk'
    logData['log'][str(i)] = note.copy()
    note = {}
logData['continued'] = True
falseData['response']['data'] = logData


with io.open('./mocks/wifi_log.json', 'w', encoding='utf-8') as f:
  f.write(json.dumps(falseData, indent = 4, ensure_ascii=False))
