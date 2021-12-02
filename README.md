# 更新规则同步模式

## 需求

根据updateAt字段来获取相应的更新操作


## 限制前提

1. insert, update, delete都会更新相应的updateAt字段


## 场景罗列如下

1. 新增数据
2. 更新数据
3. 删除数据

**需要保存消息记录**

1. 更新之后删除
2. 新增之后删除
3. 创建之后更新
4. 删除之后更新
